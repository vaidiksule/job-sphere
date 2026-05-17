import { ensureDatabase, normalizeApplication, sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/admin-password";
import type {
  AdminActivityItem,
  AdminApplicationListRow,
  AdminCharts,
  AdminDashboardData,
  AdminInitialData,
  AdminInsights,
  AdminJobRow,
  AdminOverview,
  AdminUserRow,
  ApplicationStatus,
  ImprovementPriority,
  ScoreBand,
  UserRole,
} from "@/lib/types";

const SCORE_BANDS: ScoreBand[] = ["0-40", "41-60", "61-80", "81-100"];
const STATUS_ORDER: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "interview",
  "rejected",
  "hired",
];

export async function ensureAdminAccount(username: string, password: string) {
  await ensureDatabase();
  const passwordHash = await hashPassword(password);
  await sql`
    INSERT INTO admin_accounts (username, password_hash)
    VALUES (${username}, ${passwordHash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
}

export async function seedAdminAccountIfEmpty() {
  await ensureDatabase();

  const existingDefault = await sql`
    SELECT id FROM admin_accounts WHERE username = 'vaidikadmin' LIMIT 1
  `;
  if (!existingDefault.length) {
    await ensureAdminAccount("vaidikadmin", "vaidikadmin");
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const existing = await sql`
      SELECT id FROM admin_accounts WHERE username = ${username} LIMIT 1
    `;
    if (!existing.length) {
      await ensureAdminAccount(username, password);
    }
  }
}

/** Reset admin password (e.g. fix a truncated hash in Supabase). */
export async function resetAdminPassword(username: string, password: string) {
  await ensureAdminAccount(username, password);
}

export async function getAdminAccountByUsername(username: string) {
  await ensureDatabase();
  const rows = await sql`
    SELECT id, username, password_hash
    FROM admin_accounts
    WHERE username = ${username}
    LIMIT 1
  `;
  return rows[0] as { id: string; username: string; password_hash: string } | undefined;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const account = await getAdminAccountByUsername(username);
  if (!account) return null;
  try {
    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) return null;
  } catch {
    return null;
  }
  return { id: String(account.id), username: account.username };
}

function scoreBandFromFit(fitScore: number | null): ScoreBand {
  const score = Number(fitScore ?? 0);
  if (score <= 40) return "0-40";
  if (score <= 60) return "41-60";
  if (score <= 80) return "61-80";
  return "81-100";
}

function weekKey(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

export async function getAdminApplicationById(applicationId: string) {
  await ensureDatabase();
  const rows = await sql`
    SELECT
      a.id,
      a.job_id,
      a.applicant_id,
      a.resume_file_name,
      a.application_status,
      a.analysis_status,
      a.fit_score,
      a.fit_summary,
      a.strengths,
      a.gaps,
      a.match_breakdown,
      a.application_insights,
      a.applied_at,
      u.full_name AS applicant_name,
      u.email AS applicant_email,
      j.job_title,
      j.company_name
    FROM applications a
    JOIN app_users u ON u.id = a.applicant_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ${applicationId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const normalized = normalizeApplication(row as Record<string, unknown>);
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    applicantId: String(row.applicant_id),
    applicantName: String(row.applicant_name),
    applicantEmail: String(row.applicant_email),
    jobTitle: String(row.job_title),
    companyName: String(row.company_name),
    applicationStatus: normalized.application_status,
    analysisStatus: String(row.analysis_status ?? "pending"),
    fitScore: row.fit_score === null ? null : Number(row.fit_score),
    appliedAt: String(row.applied_at),
    resumeFileName: String(row.resume_file_name),
    fitSummary: normalized.fit_summary,
    strengths: normalized.strengths,
    gaps: normalized.gaps,
    matchBreakdown: normalized.match_breakdown ?? null,
    applicationInsights: normalized.application_insights ?? null,
  } satisfies AdminApplicationListRow;
}

function mapApplicationListRow(row: Record<string, unknown>) {
  const priority = row.improvement_priority as ImprovementPriority | null;
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    applicantId: String(row.applicant_id),
    applicantName: String(row.applicant_name),
    applicantEmail: String(row.applicant_email),
    jobTitle: String(row.job_title),
    companyName: String(row.company_name),
    applicationStatus: String(row.application_status) as ApplicationStatus,
    analysisStatus: String(row.analysis_status ?? "pending"),
    fitScore: row.fit_score === null ? null : Number(row.fit_score),
    appliedAt: String(row.applied_at),
    resumeFileName: String(row.resume_file_name),
    fitSummary: null,
    strengths: [],
    gaps: [],
    matchBreakdown: null,
    applicationInsights: priority
      ? {
          candidateSummary: "",
          missingCriticalSkills: [],
          matchingSkills: [],
          experienceHighlights: [],
          educationHighlights: [],
          recommendedQuestions: [],
          improvementPriority: priority,
          hiringRecommendation: "",
          scoreBand: "0-40",
        }
      : null,
  } satisfies AdminApplicationListRow;
}

export async function getAdminUsersList(): Promise<AdminUserRow[]> {
  await ensureDatabase();
  const users = await sql`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.company_name,
      u.headline,
      u.created_at,
      COALESCE(jc.count, 0)::int AS jobs_posted,
      COALESCE(ac.count, 0)::int AS applications_submitted,
      GREATEST(u.updated_at, COALESCE(ac.last_applied, u.created_at)) AS last_active_at
    FROM app_users u
    LEFT JOIN (
      SELECT recruiter_id, COUNT(*)::int AS count
      FROM jobs
      GROUP BY recruiter_id
    ) jc ON jc.recruiter_id = u.id
    LEFT JOIN (
      SELECT applicant_id, COUNT(*)::int AS count, MAX(applied_at) AS last_applied
      FROM applications
      GROUP BY applicant_id
    ) ac ON ac.applicant_id = u.id
    ORDER BY u.created_at DESC
  `;

  return users.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    name: String(row.full_name),
    role: (row.role as UserRole | null) ?? null,
    companyName: row.company_name ? String(row.company_name) : null,
    headline: row.headline ? String(row.headline) : null,
    createdAt: String(row.created_at),
    jobsPosted: Number(row.jobs_posted ?? 0),
    applicationsSubmitted: Number(row.applications_submitted ?? 0),
    lastActiveAt: row.last_active_at ? String(row.last_active_at) : null,
  }));
}

export async function getAdminJobsList(): Promise<AdminJobRow[]> {
  await ensureDatabase();
  const jobs = await sql`
    SELECT
      j.id,
      j.job_title,
      j.company_name,
      j.location,
      j.workplace_type,
      j.status,
      j.created_at,
      u.full_name AS recruiter_name,
      u.email AS recruiter_email,
      COUNT(a.id)::int AS application_count,
      ROUND(AVG(a.fit_score))::int AS avg_fit_score
    FROM jobs j
    JOIN app_users u ON u.id = j.recruiter_id
    LEFT JOIN applications a ON a.job_id = j.id
    GROUP BY j.id, u.full_name, u.email
    ORDER BY application_count DESC, j.created_at DESC
  `;

  return jobs.map((row) => ({
    id: String(row.id),
    jobTitle: String(row.job_title),
    companyName: String(row.company_name),
    location: String(row.location),
    workplaceType: String(row.workplace_type ?? "unspecified"),
    status: String(row.status),
    recruiterName: String(row.recruiter_name),
    recruiterEmail: String(row.recruiter_email),
    applicationCount: Number(row.application_count ?? 0),
    avgFitScore: Number(row.avg_fit_score ?? 0),
    createdAt: String(row.created_at),
  }));
}

export async function getAdminApplicationsList(): Promise<AdminApplicationListRow[]> {
  await ensureDatabase();
  const applications = await sql`
    SELECT
      a.id,
      a.job_id,
      a.applicant_id,
      a.resume_file_name,
      a.application_status,
      a.analysis_status,
      a.fit_score,
      a.applied_at,
      u.full_name AS applicant_name,
      u.email AS applicant_email,
      j.job_title,
      j.company_name,
      (a.application_insights->>'improvementPriority') AS improvement_priority
    FROM applications a
    JOIN app_users u ON u.id = a.applicant_id
    JOIN jobs j ON j.id = a.job_id
    ORDER BY a.applied_at DESC
  `;

  return applications.map((row) => mapApplicationListRow(row as Record<string, unknown>));
}

async function fetchAdminChartsFromSql(): Promise<AdminCharts> {
  // Run sequentially — postgres.js with max:1 throws if many queries run in parallel.
  const usersByRole = await sql`SELECT COALESCE(role, 'unassigned') AS role, COUNT(*)::int AS count FROM app_users GROUP BY 1`;
  const signupsByWeek = await sql`
    SELECT to_char(date_trunc('week', created_at::timestamp), 'YYYY-MM-DD') AS week, COUNT(*)::int AS count
    FROM app_users
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 8
  `;
  const applicationsByWeek = await sql`
    SELECT to_char(date_trunc('week', applied_at::timestamp), 'YYYY-MM-DD') AS week, COUNT(*)::int AS count
    FROM applications
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 8
  `;
  const statusRows = await sql`
    SELECT application_status AS status, COUNT(*)::int AS count FROM applications GROUP BY 1
  `;
  const scoreBandRows = await sql`
    SELECT
      CASE
        WHEN fit_score IS NULL OR fit_score <= 40 THEN '0-40'
        WHEN fit_score <= 60 THEN '41-60'
        WHEN fit_score <= 80 THEN '61-80'
        ELSE '81-100'
      END AS band,
      COUNT(*)::int AS count
    FROM applications
    GROUP BY 1
  `;
  const topJobs = await sql`
    SELECT j.job_title, j.company_name, COUNT(a.id)::int AS count
    FROM jobs j
    LEFT JOIN applications a ON a.job_id = j.id
    GROUP BY j.id, j.job_title, j.company_name
    ORDER BY count DESC
    LIMIT 8
  `;
  const analysisStatus = await sql`SELECT analysis_status AS status, COUNT(*)::int AS count FROM applications GROUP BY 1`;
  const workplaceTypes = await sql`SELECT workplace_type AS type, COUNT(*)::int AS count FROM jobs GROUP BY 1`;
  const topCompanies = await sql`
    SELECT j.company_name AS company, COUNT(a.id)::int AS count
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    GROUP BY j.company_name
    ORDER BY count DESC
    LIMIT 8
  `;
  const avgFitByJob = await sql`
    SELECT j.job_title, j.company_name, ROUND(AVG(a.fit_score))::int AS avg_fit, COUNT(a.id)::int AS applicants
    FROM jobs j
    JOIN applications a ON a.job_id = j.id
    WHERE a.fit_score IS NOT NULL
    GROUP BY j.id, j.job_title, j.company_name
    HAVING COUNT(a.id) > 0
    ORDER BY avg_fit DESC
    LIMIT 8
  `;
  const improvementPriority = await sql`
    SELECT application_insights->>'improvementPriority' AS priority, COUNT(*)::int AS count
    FROM applications
    WHERE application_insights IS NOT NULL
    GROUP BY 1
  `;
  const avgFitByWeek = await sql`
    SELECT
      to_char(date_trunc('week', applied_at::timestamp), 'YYYY-MM-DD') AS week,
      ROUND(AVG(fit_score))::int AS avg_fit,
      COUNT(*)::int AS applications
    FROM applications
    WHERE fit_score IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 8
  `;
  const openClosed = await sql`SELECT status, COUNT(*)::int AS count FROM jobs GROUP BY status`;
  const jobApplicantCounts = await sql`
    SELECT COUNT(a.id)::int AS applicant_count
    FROM jobs j
    LEFT JOIN applications a ON a.job_id = j.id
    GROUP BY j.id
  `;

  const statusCounts = new Map<ApplicationStatus, number>();
  for (const status of STATUS_ORDER) statusCounts.set(status, 0);
  for (const row of statusRows) {
    statusCounts.set(String(row.status) as ApplicationStatus, Number(row.count ?? 0));
  }

  const bandCounts = new Map<ScoreBand, number>();
  for (const band of SCORE_BANDS) bandCounts.set(band, 0);
  for (const row of scoreBandRows) {
    bandCounts.set(String(row.band) as ScoreBand, Number(row.count ?? 0));
  }

  const priorityCounts = new Map<ImprovementPriority, number>();
  for (const priority of ["low", "medium", "high"] as ImprovementPriority[]) {
    priorityCounts.set(priority, 0);
  }
  for (const row of improvementPriority) {
    const key = String(row.priority ?? "") as ImprovementPriority;
    if (priorityCounts.has(key)) priorityCounts.set(key, Number(row.count ?? 0));
  }

  const jobBuckets = new Map<string, number>();
  for (const label of ["0", "1–3", "4–7", "8+"]) jobBuckets.set(label, 0);
  for (const row of jobApplicantCounts) {
    const count = Number(row.applicant_count ?? 0);
    const bucket = count === 0 ? "0" : count <= 3 ? "1–3" : count <= 7 ? "4–7" : "8+";
    jobBuckets.set(bucket, (jobBuckets.get(bucket) ?? 0) + 1);
  }

  let openJobs = 0;
  let closedJobs = 0;
  for (const row of openClosed) {
    if (String(row.status) === "open") openJobs = Number(row.count ?? 0);
    else closedJobs += Number(row.count ?? 0);
  }

  type WeekAggregateRow = {
    week: string;
    count?: number;
    avg_fit?: number;
    applications?: number;
  };

  const sortWeeksAsc = (rows: WeekAggregateRow[]) =>
    [...rows]
      .sort((left, right) => String(left.week).localeCompare(String(right.week)))
      .map((row) => ({
        week: String(row.week),
        count: Number(row.count ?? 0),
        avgFit: Number(row.avg_fit ?? 0),
        applications: Number(row.applications ?? 0),
      }));

  const signupsWeekRows = signupsByWeek as unknown as WeekAggregateRow[];
  const applicationsWeekRows = applicationsByWeek as unknown as WeekAggregateRow[];
  const avgFitWeekRows = avgFitByWeek as unknown as WeekAggregateRow[];

  return {
    usersByRole: usersByRole.map((row) => ({ role: String(row.role), count: Number(row.count ?? 0) })),
    signupsByWeek: sortWeeksAsc(signupsWeekRows).map(({ week, count }) => ({ week, count })),
    applicationsByWeek: sortWeeksAsc(applicationsWeekRows).map(({ week, count }) => ({ week, count })),
    statusBreakdown: STATUS_ORDER.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    scoreBands: SCORE_BANDS.map((band) => ({ band, count: bandCounts.get(band) ?? 0 })),
    topJobsByApplicants: topJobs.map((row) => ({
      jobTitle: String(row.job_title),
      companyName: String(row.company_name),
      count: Number(row.count ?? 0),
    })),
    analysisStatus: analysisStatus
      .map((row) => ({ status: String(row.status), count: Number(row.count ?? 0) }))
      .sort((left, right) => right.count - left.count),
    workplaceTypes: workplaceTypes
      .map((row) => ({ type: String(row.type), count: Number(row.count ?? 0) }))
      .sort((left, right) => right.count - left.count),
    topCompanies: topCompanies.map((row) => ({
      company: String(row.company),
      count: Number(row.count ?? 0),
    })),
    avgFitByJob: avgFitByJob.map((row) => ({
      jobTitle: String(row.job_title),
      companyName: String(row.company_name),
      avgFit: Number(row.avg_fit ?? 0),
      applicants: Number(row.applicants ?? 0),
    })),
    hiringFunnel: [
      { stage: "Submitted", count: statusCounts.get("submitted") ?? 0 },
      { stage: "Under review", count: statusCounts.get("under_review") ?? 0 },
      { stage: "Shortlisted", count: statusCounts.get("shortlisted") ?? 0 },
      { stage: "Interview", count: statusCounts.get("interview") ?? 0 },
      { stage: "Hired", count: statusCounts.get("hired") ?? 0 },
    ],
    applicationsPerJobBuckets: ["0", "1–3", "4–7", "8+"].map((bucket) => ({
      bucket,
      jobCount: jobBuckets.get(bucket) ?? 0,
    })),
    improvementPriority: (["low", "medium", "high"] as ImprovementPriority[]).map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    })),
    avgFitByWeek: sortWeeksAsc(avgFitWeekRows).map(({ week, avgFit, applications }) => ({
      week,
      avgFit,
      applications,
    })),
    openVsClosedJobs: [
      { status: "Open", count: openJobs },
      { status: "Closed", count: closedJobs },
    ],
  };
}

function buildAdminInsightsFromOverview(
  overview: AdminOverview,
  extras: { high_fit: number; zero_jobs: number },
): AdminInsights {
  const totalApplications = overview.totalApplications || 1;
  const applicantCount = overview.applicants || 1;

  return {
    hireRate: Math.round((overview.hired / totalApplications) * 100),
    shortlistRate: Math.round((overview.shortlisted / totalApplications) * 100),
    interviewRate: Math.round((overview.interview / totalApplications) * 100),
    analysisCompletionRate: Math.round((overview.processedApplications / totalApplications) * 100),
    avgApplicantsPerJob:
      overview.totalJobs > 0 ? Math.round((overview.totalApplications / overview.totalJobs) * 10) / 10 : 0,
    avgApplicationsPerApplicant:
      Math.round((overview.totalApplications / applicantCount) * 10) / 10,
    highFitCandidates: Number(extras.high_fit ?? 0),
    jobsWithZeroApplicants: Number(extras.zero_jobs ?? 0),
  };
}

function buildAdminActivity(
  recentApplications: Array<Record<string, unknown>>,
  recentUsers: Array<Record<string, unknown>>,
): AdminActivityItem[] {
  return [
    ...recentApplications.map((row) => ({
      id: `app-${row.id}`,
      type: "application" as const,
      title: `${row.applicant_name} applied`,
      subtitle: `${row.job_title} at ${row.company_name}`,
      at: String(row.applied_at),
    })),
    ...recentUsers.map((row) => ({
      id: `user-${row.id}`,
      type: "signup" as const,
      title: `${row.full_name} joined`,
      subtitle: String(row.email),
      at: String(row.created_at),
    })),
  ]
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 25);
}

export async function getAdminChartsData(): Promise<AdminCharts> {
  await ensureDatabase();
  return fetchAdminChartsFromSql();
}

export async function getAdminOverviewData(): Promise<AdminInitialData> {
  await ensureDatabase();

  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM app_users) AS total_users,
      (SELECT COUNT(*)::int FROM app_users WHERE role = 'recruiter') AS recruiters,
      (SELECT COUNT(*)::int FROM app_users WHERE role = 'applicant') AS applicants,
      (SELECT COUNT(*)::int FROM jobs) AS total_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE status = 'open') AS open_jobs,
      (SELECT COUNT(*)::int FROM applications) AS total_applications,
      (SELECT ROUND(AVG(fit_score))::int FROM applications) AS avg_fit,
      (SELECT COUNT(*)::int FROM applications WHERE analysis_status IS DISTINCT FROM 'completed') AS pending_analyses,
      (SELECT COUNT(*)::int FROM applications WHERE analysis_status = 'completed') AS processed_applications,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'submitted') AS submitted,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'under_review') AS under_review,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'shortlisted') AS shortlisted,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'interview') AS interview,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'rejected') AS rejected,
      (SELECT COUNT(*)::int FROM applications WHERE application_status = 'hired') AS hired,
      (SELECT COUNT(*)::int FROM applications WHERE fit_score >= 81) AS high_fit,
      (
        SELECT COUNT(*)::int
        FROM jobs j
        WHERE NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id = j.id)
      ) AS zero_jobs
  `;

  const recentUsers = await sql`
    SELECT id, full_name, email, created_at
    FROM app_users
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const recentApplications = await sql`
    SELECT
      a.id,
      a.applied_at,
      u.full_name AS applicant_name,
      j.job_title,
      j.company_name
    FROM applications a
    JOIN app_users u ON u.id = a.applicant_id
    JOIN jobs j ON j.id = a.job_id
    ORDER BY a.applied_at DESC
    LIMIT 20
  `;

  const overview: AdminOverview = {
    totalUsers: Number(stats?.total_users ?? 0),
    recruiters: Number(stats?.recruiters ?? 0),
    applicants: Number(stats?.applicants ?? 0),
    totalJobs: Number(stats?.total_jobs ?? 0),
    openJobs: Number(stats?.open_jobs ?? 0),
    totalApplications: Number(stats?.total_applications ?? 0),
    avgFitScore: Number(stats?.avg_fit ?? 0),
    pendingAnalyses: Number(stats?.pending_analyses ?? 0),
    processedApplications: Number(stats?.processed_applications ?? 0),
    submitted: Number(stats?.submitted ?? 0),
    underReview: Number(stats?.under_review ?? 0),
    shortlisted: Number(stats?.shortlisted ?? 0),
    interview: Number(stats?.interview ?? 0),
    rejected: Number(stats?.rejected ?? 0),
    hired: Number(stats?.hired ?? 0),
  };

  return {
    overview,
    insights: buildAdminInsightsFromOverview(overview, {
      high_fit: Number(stats?.high_fit ?? 0),
      zero_jobs: Number(stats?.zero_jobs ?? 0),
    }),
    activity: buildAdminActivity(
      recentApplications as Array<Record<string, unknown>>,
      recentUsers as Array<Record<string, unknown>>,
    ),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const initial = await getAdminOverviewData();
  const charts = await getAdminChartsData();
  const users = await getAdminUsersList();
  const jobs = await getAdminJobsList();
  const applications = await getAdminApplicationsList();

  return {
    ...initial,
    charts,
    users,
    jobs,
    applications,
  };
}
