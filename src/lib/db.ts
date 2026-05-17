// import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import type { ApplicationInsights, ApplicationRow, ApplicationStatus, DashboardData, MatchBreakdown, UserRole } from "@/lib/types";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database-backed features will fail until it is configured.");
}

function isLocalDatabase(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function getPostgresOptions(url: string) {
  if (isLocalDatabase(url)) return { max: 1 };
  // Allow a few concurrent queries per serverless instance (overview + charts).
  return { ssl: "require" as const, max: 4 };
}

export function usesRemoteManagedDatabase() {
  return Boolean(connectionString && !isLocalDatabase(connectionString));
}

export const sql = postgres(
  connectionString ?? "postgres://placeholder:placeholder@localhost/placeholder",
  connectionString ? getPostgresOptions(connectionString) : { max: 1 },
);

let initialized = false;

async function ensureDatabaseLightweight() {
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function ensureDatabase() {
  if (initialized || !connectionString) return;

  // Remote Supabase / Vercel: skip 15+ DDL round-trips; schema is managed in the dashboard.
  if (process.env.VERCEL || usesRemoteManagedDatabase()) {
    await ensureDatabaseLightweight();
    initialized = true;
    return;
  }

  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      image_url TEXT,
      role TEXT CHECK (role IN ('recruiter', 'applicant')),
      onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
      company_name TEXT,
      headline TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recruiter_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      location TEXT NOT NULL,
      workplace_type TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      applicant_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      resume_file_name TEXT NOT NULL,
      resume_text TEXT NOT NULL,
      structured_resume JSONB,
      analysis_status TEXT NOT NULL DEFAULT 'pending',
      application_status TEXT NOT NULL DEFAULT 'submitted',
      fit_score INTEGER,
      fit_summary TEXT,
      strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
      gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
      match_breakdown JSONB,
      application_insights JSONB,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, applicant_id)
    )
  `;

  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS structured_resume JSONB`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'pending'`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'submitted'`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS match_breakdown JSONB`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_insights JSONB`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url TEXT`;
  await sql`ALTER TABLE applications ALTER COLUMN fit_score DROP NOT NULL`;
  await sql`ALTER TABLE applications ALTER COLUMN fit_summary DROP NOT NULL`;
  try {
    await sql`ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_application_status_check`;
    await sql`
      ALTER TABLE applications
      ADD CONSTRAINT applications_application_status_check
      CHECK (application_status IN ('submitted', 'under_review', 'shortlisted', 'interview', 'rejected', 'hired'))
    `;
  } catch (e) {
    // Ignore concurrent race conditions where constraint might already exist
  }
  await sql`UPDATE applications SET analysis_status = 'completed' WHERE analysis_status IS NULL AND fit_score IS NOT NULL`;
  await sql`UPDATE applications SET analysis_status = 'pending' WHERE analysis_status IS NULL`;
  await sql`UPDATE applications SET application_status = 'submitted' WHERE application_status IS NULL`;

  await sql`CREATE INDEX IF NOT EXISTS jobs_recruiter_idx ON jobs(recruiter_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS applications_job_idx ON applications(job_id, applied_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS applications_applicant_idx ON applications(applicant_id, applied_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  initialized = true;
}

export async function upsertUser(input: {
  email: string;
  fullName: string;
  imageUrl?: string | null;
}) {
  await ensureDatabase();

  const rows = await sql`
    INSERT INTO app_users (email, full_name, image_url)
    VALUES (${input.email}, ${input.fullName}, ${input.imageUrl ?? null})
    ON CONFLICT (email)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      image_url = COALESCE(EXCLUDED.image_url, app_users.image_url),
      updated_at = NOW()
    RETURNING id, email, full_name, image_url, role, onboarding_complete, company_name, headline;
  `;

  return rows[0];
}

export async function getUserByEmail(email: string) {
  await ensureDatabase();
  const rows = await sql`
    SELECT id, email, full_name, image_url, role, onboarding_complete, company_name, headline
    FROM app_users
    WHERE email = ${email}
    LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function updateUserOnboarding(input: {
  email: string;
  role: UserRole;
  companyName?: string;
  headline?: string;
}) {
  await ensureDatabase();
  const rows = await sql`
    UPDATE app_users
    SET role = ${input.role},
        company_name = ${input.companyName ?? null},
        headline = ${input.headline ?? null},
        onboarding_complete = TRUE,
        updated_at = NOW()
    WHERE email = ${input.email}
    RETURNING id, email, full_name, image_url, role, onboarding_complete, company_name, headline;
  `;
  return rows[0] ?? null;
}

export async function createJob(input: {
  recruiterId: string;
  companyName: string;
  jobTitle: string;
  location: string;
  workplaceType: string;
  employmentType: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  description: string;
  requirements: string;
  responsibilities: string;
}) {
  await ensureDatabase();
  const rows = await sql`
    INSERT INTO jobs (
      recruiter_id, company_name, job_title, location, workplace_type, employment_type,
      salary_min, salary_max, salary_currency, description, requirements, responsibilities
    )
    VALUES (
      ${input.recruiterId}, ${input.companyName}, ${input.jobTitle}, ${input.location}, ${input.workplaceType}, ${input.employmentType},
      ${input.salaryMin ?? null}, ${input.salaryMax ?? null}, ${input.salaryCurrency ?? "USD"}, ${input.description}, ${input.requirements}, ${input.responsibilities}
    )
    RETURNING *;
  `;
  return rows[0];
}

export async function listOpenJobs() {
  await ensureDatabase();
  return sql`
    SELECT
      j.*,
      COUNT(a.id)::INT AS application_count,
      ROUND(AVG(a.fit_score))::INT AS avg_fit_score
    FROM jobs j
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE j.status = 'open'
    GROUP BY j.id
    ORDER BY j.created_at DESC;
  `;
}

export async function getJobById(jobId: string) {
  await ensureDatabase();
  const rows = await sql`
    SELECT * FROM jobs WHERE id = ${jobId} LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function createApplication(input: {
  jobId: string;
  applicantId: string;
  resumeFileName: string;
  resumeUrl?: string | null;
  resumeText: string;
  structuredResume?: Record<string, unknown> | null;
}) {
  await ensureDatabase();
  const rows = await sql`
    INSERT INTO applications (
      job_id, applicant_id, resume_file_name, resume_url, resume_text, structured_resume, analysis_status, application_status, fit_score, fit_summary, strengths, gaps, match_breakdown, application_insights
    )
    VALUES (
      ${input.jobId},
      ${input.applicantId},
      ${input.resumeFileName},
      ${input.resumeUrl ?? null},
      ${input.resumeText},
      ${input.structuredResume ? JSON.stringify(input.structuredResume) : null}::jsonb,
      'pending',
      'submitted',
      NULL,
      NULL,
      '[]'::jsonb,
      '[]'::jsonb,
      NULL,
      NULL
    )
    ON CONFLICT (job_id, applicant_id)
    DO UPDATE SET
      resume_file_name = EXCLUDED.resume_file_name,
      resume_url = COALESCE(EXCLUDED.resume_url, applications.resume_url),
      resume_text = EXCLUDED.resume_text,
      structured_resume = EXCLUDED.structured_resume,
      analysis_status = 'pending',
      application_status = CASE
        WHEN applications.application_status IN ('rejected', 'hired') THEN 'submitted'
        ELSE applications.application_status
      END,
      fit_score = NULL,
      fit_summary = NULL,
      strengths = EXCLUDED.strengths,
      gaps = EXCLUDED.gaps,
      match_breakdown = NULL,
      application_insights = NULL,
      applied_at = NOW()
    RETURNING *;
  `;
  return rows[0];
}

export async function updateApplicationAnalysis(input: {
  applicationId: string;
  structuredResume: Record<string, unknown>;
  fitScore: number;
  fitSummary: string;
  strengths: string[];
  gaps: string[];
  matchBreakdown: MatchBreakdown;
  applicationInsights: ApplicationInsights;
  analysisStatus?: "completed" | "failed";
}) {
  await ensureDatabase();
  const rows = await sql`
    UPDATE applications
    SET structured_resume = ${JSON.stringify(input.structuredResume)}::jsonb,
        fit_score = ${input.fitScore},
        fit_summary = ${input.fitSummary},
        strengths = ${JSON.stringify(input.strengths)}::jsonb,
        gaps = ${JSON.stringify(input.gaps)}::jsonb,
        match_breakdown = ${JSON.stringify(input.matchBreakdown)}::jsonb,
        application_insights = ${JSON.stringify(input.applicationInsights)}::jsonb,
        analysis_status = ${input.analysisStatus ?? "completed"}
    WHERE id = ${input.applicationId}
    RETURNING *;
  `;
  return rows[0] ?? null;
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  recruiterId: string;
  status: ApplicationStatus;
}) {
  await ensureDatabase();
  const rows = await sql`
    UPDATE applications a
    SET application_status = ${input.status}
    FROM jobs j
    WHERE a.id = ${input.applicationId}
      AND j.id = a.job_id
      AND j.recruiter_id = ${input.recruiterId}
    RETURNING a.*;
  `;

  return rows[0] ?? null;
}

export async function listPendingApplicationsForRecruiter(recruiterId: string) {
  await ensureDatabase();
  return sql`
    SELECT
      a.*,
      j.job_title,
      j.company_name,
      j.description,
      j.requirements,
      j.responsibilities,
      u.full_name AS applicant_name,
      u.email AS applicant_email
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN app_users u ON u.id = a.applicant_id
    WHERE j.recruiter_id = ${recruiterId}
      AND COALESCE(a.analysis_status, 'pending') IN ('pending', 'failed')
    ORDER BY a.applied_at ASC;
  `;
}

export async function getDashboardData(email: string): Promise<DashboardData | null> {
  await ensureDatabase();

  const user = await getUserByEmail(email);
  if (!user) return null;

  const [jobs, recruiterJobs, recruiterApplications, applicantApplications] = await Promise.all([
    listOpenJobs(),
    user.role === "recruiter"
      ? sql`
          SELECT
            j.*,
            COUNT(a.id)::INT AS application_count,
            ROUND(AVG(a.fit_score))::INT AS avg_fit_score
          FROM jobs j
          LEFT JOIN applications a ON a.job_id = j.id
          WHERE j.recruiter_id = ${user.id}
          GROUP BY j.id
          ORDER BY j.created_at DESC;
        `
      : Promise.resolve([]),
    user.role === "recruiter"
      ? sql`
          SELECT
            a.id,
            a.job_id,
            a.applicant_id,
            a.resume_file_name,
            a.resume_url,
            a.resume_text,
            a.application_status,
            a.fit_score,
            a.fit_summary,
            a.strengths,
            a.gaps,
            a.match_breakdown,
            a.application_insights,
            a.structured_resume,
            a.analysis_status,
            a.applied_at,
            u.full_name AS applicant_name,
            u.email AS applicant_email,
            j.job_title,
            j.company_name
          FROM applications a
          JOIN jobs j ON j.id = a.job_id
          JOIN app_users u ON u.id = a.applicant_id
          WHERE j.recruiter_id = ${user.id}
          ORDER BY a.applied_at DESC;
        `
      : Promise.resolve([]),
    user.role === "applicant"
      ? sql`
          SELECT
            a.id,
            a.job_id,
            a.applicant_id,
            a.resume_file_name,
            a.resume_url,
            a.resume_text,
            a.application_status,
            a.fit_score,
            a.fit_summary,
            a.strengths,
            a.gaps,
            a.match_breakdown,
            a.application_insights,
            a.structured_resume,
            a.analysis_status,
            a.applied_at,
            u.full_name AS applicant_name,
            u.email AS applicant_email,
            j.job_title,
            j.company_name
          FROM applications a
          JOIN jobs j ON j.id = a.job_id
          JOIN app_users u ON u.id = a.applicant_id
          WHERE a.applicant_id = ${user.id}
          ORDER BY a.applied_at DESC;
        `
      : Promise.resolve([]),
  ]);

  const totalApplications = user.role === "recruiter"
    ? recruiterApplications.length
    : applicantApplications.length;

  const avgFitScore = totalApplications > 0
    ? Math.round((user.role === "recruiter" ? recruiterApplications : applicantApplications).reduce((sum, item) => sum + Number(item.fit_score || 0), 0) / totalApplications)
    : 0;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: (user.role ?? "applicant") as UserRole,
      onboardingComplete: Boolean(user.onboarding_complete),
      companyName: user.company_name,
      headline: user.headline,
    },
    jobs: jobs as unknown as DashboardData["jobs"],
    recruiterJobs: recruiterJobs as unknown as DashboardData["recruiterJobs"],
    recruiterApplications: recruiterApplications.map(normalizeApplication),
    applicantApplications: applicantApplications.map(normalizeApplication),
    metrics: {
      totalJobs: user.role === "recruiter" ? recruiterJobs.length : jobs.length,
      totalApplications,
      openRoles: user.role === "recruiter"
        ? recruiterJobs.filter((job) => job.status === "open").length
        : jobs.length,
      avgFitScore,
    },
  };
}

export function normalizeApplication(row: Record<string, unknown>): ApplicationRow {
  return {
    ...row,
    application_status: parseApplicationStatus(row.application_status),
    strengths: parseJsonArray(row.strengths),
    gaps: parseJsonArray(row.gaps),
    match_breakdown: parseMatchBreakdown(row.match_breakdown),
    application_insights: parseApplicationInsights(row.application_insights),
    structured_resume: parseJsonObject(row.structured_resume),
  } as ApplicationRow;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseMatchBreakdown(value: unknown): MatchBreakdown | null {
  const parsed = parseJsonObject(value);
  if (!parsed) return null;

  return {
    skillMatch: toPercent(parsed.skillMatch),
    experienceMatch: toPercent(parsed.experienceMatch),
    educationMatch: toPercent(parsed.educationMatch),
    keywordOverlap: toPercent(parsed.keywordOverlap),
    responsibilityMatch: toPercent(parsed.responsibilityMatch),
    seniorityMatch: toPercent(parsed.seniorityMatch),
    roleAlignment: toPercent(parsed.roleAlignment),
    overallReadiness: toPercent(parsed.overallReadiness),
    atsKeywordCoverage: toPercent(parsed.atsKeywordCoverage),
    topMatches: parseJsonArray(parsed.topMatches),
    topGaps: parseJsonArray(parsed.topGaps),
    improvementSuggestions: parseJsonArray(parsed.improvementSuggestions),
  };
}

function parseApplicationInsights(value: unknown): ApplicationInsights | null {
  const parsed = parseJsonObject(value);
  if (!parsed) return null;

  return {
    candidateSummary: String(parsed.candidateSummary ?? ""),
    missingCriticalSkills: parseJsonArray(parsed.missingCriticalSkills),
    matchingSkills: parseJsonArray(parsed.matchingSkills),
    experienceHighlights: parseJsonArray(parsed.experienceHighlights),
    educationHighlights: parseJsonArray(parsed.educationHighlights),
    recommendedQuestions: parseJsonArray(parsed.recommendedQuestions),
    improvementPriority: parseImprovementPriority(parsed.improvementPriority),
    hiringRecommendation: String(parsed.hiringRecommendation ?? ""),
    scoreBand: parseScoreBand(parsed.scoreBand),
  };
}

function toPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseApplicationStatus(value: unknown): ApplicationStatus {
  switch (value) {
    case "submitted":
    case "under_review":
    case "shortlisted":
    case "interview":
    case "rejected":
    case "hired":
      return value;
    default:
      return "submitted";
  }
}

function parseImprovementPriority(value: unknown): ApplicationInsights["improvementPriority"] {
  switch (value) {
    case "low":
    case "medium":
    case "high":
      return value;
    default:
      return "medium";
  }
}

function parseScoreBand(value: unknown): ApplicationInsights["scoreBand"] {
  switch (value) {
    case "0-40":
    case "41-60":
    case "61-80":
    case "81-100":
      return value;
    default:
      return "41-60";
  }
}
