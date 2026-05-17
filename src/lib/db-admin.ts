import { ensureDatabase, normalizeApplication, sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/admin-password";
import type {
  AdminActivityItem,
  AdminApplicationListRow,
  AdminCharts,
  AdminDashboardData,
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

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await ensureDatabase();
  await seedAdminAccountIfEmpty();

  const [
    userStats,
    jobStats,
    appStats,
    users,
    jobs,
    applications,
    recentUsers,
    recentApplications,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE role = 'recruiter')::int AS recruiters,
        COUNT(*) FILTER (WHERE role = 'applicant')::int AS applicants
      FROM app_users
    `,
    sql`
      SELECT
        COUNT(*)::int AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_jobs
      FROM jobs
    `,
    sql`
      SELECT
        COUNT(*)::int AS total_applications,
        ROUND(AVG(fit_score))::int AS avg_fit,
        COUNT(*) FILTER (WHERE analysis_status IS DISTINCT FROM 'completed')::int AS pending_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'completed')::int AS processed_applications,
        COUNT(*) FILTER (WHERE application_status = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE application_status = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE application_status = 'shortlisted')::int AS shortlisted,
        COUNT(*) FILTER (WHERE application_status = 'interview')::int AS interview,
        COUNT(*) FILTER (WHERE application_status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE application_status = 'hired')::int AS hired
      FROM applications
    `,
    sql`
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
    `,
    sql`
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
    `,
    sql`
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
      ORDER BY a.applied_at DESC
    `,
    sql`
      SELECT id, full_name, email, created_at
      FROM app_users
      ORDER BY created_at DESC
      LIMIT 10
    `,
    sql`
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
    `,
  ]);

  const overview: AdminOverview = {
    totalUsers: Number(userStats[0]?.total_users ?? 0),
    recruiters: Number(userStats[0]?.recruiters ?? 0),
    applicants: Number(userStats[0]?.applicants ?? 0),
    totalJobs: Number(jobStats[0]?.total_jobs ?? 0),
    openJobs: Number(jobStats[0]?.open_jobs ?? 0),
    totalApplications: Number(appStats[0]?.total_applications ?? 0),
    avgFitScore: Number(appStats[0]?.avg_fit ?? 0),
    pendingAnalyses: Number(appStats[0]?.pending_analyses ?? 0),
    processedApplications: Number(appStats[0]?.processed_applications ?? 0),
    submitted: Number(appStats[0]?.submitted ?? 0),
    underReview: Number(appStats[0]?.under_review ?? 0),
    shortlisted: Number(appStats[0]?.shortlisted ?? 0),
    interview: Number(appStats[0]?.interview ?? 0),
    rejected: Number(appStats[0]?.rejected ?? 0),
    hired: Number(appStats[0]?.hired ?? 0),
  };

  const adminUsers: AdminUserRow[] = users.map((row) => ({
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

  const adminJobs: AdminJobRow[] = jobs.map((row) => ({
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

  const adminApplications: AdminApplicationListRow[] = applications.map((row) => {
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
    };
  });

  const insights = buildAdminInsights(overview, adminUsers, adminJobs, adminApplications);
  const charts = buildAdminCharts(adminUsers, adminJobs, adminApplications);

  const activity: AdminActivityItem[] = [
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

  return {
    overview,
    insights,
    charts,
    users: adminUsers,
    jobs: adminJobs,
    applications: adminApplications,
    activity,
  };
}

function buildAdminInsights(
  overview: AdminOverview,
  users: AdminUserRow[],
  jobs: AdminJobRow[],
  applications: AdminApplicationListRow[],
): AdminInsights {
  const totalApplications = overview.totalApplications || 1;
  const applicantCount = users.filter((user) => user.role === "applicant").length || overview.applicants || 1;

  return {
    hireRate: Math.round((overview.hired / totalApplications) * 100),
    shortlistRate: Math.round((overview.shortlisted / totalApplications) * 100),
    interviewRate: Math.round((overview.interview / totalApplications) * 100),
    analysisCompletionRate: Math.round((overview.processedApplications / totalApplications) * 100),
    avgApplicantsPerJob:
      jobs.length > 0 ? Math.round((overview.totalApplications / jobs.length) * 10) / 10 : 0,
    avgApplicationsPerApplicant:
      Math.round((overview.totalApplications / applicantCount) * 10) / 10,
    highFitCandidates: applications.filter((application) => (application.fitScore ?? 0) >= 81).length,
    jobsWithZeroApplicants: jobs.filter((job) => job.applicationCount === 0).length,
  };
}

function buildAdminCharts(
  users: AdminUserRow[],
  jobs: AdminJobRow[],
  applications: AdminApplicationListRow[],
): AdminCharts {
  const roleCounts = new Map<string, number>();
  for (const user of users) {
    const role = user.role ?? "unassigned";
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const signupWeeks = new Map<string, number>();
  for (const user of users) {
    const key = weekKey(new Date(user.createdAt));
    signupWeeks.set(key, (signupWeeks.get(key) ?? 0) + 1);
  }

  const applicationWeeks = new Map<string, number>();
  for (const application of applications) {
    const key = weekKey(new Date(application.appliedAt));
    applicationWeeks.set(key, (applicationWeeks.get(key) ?? 0) + 1);
  }

  const statusCounts = new Map<ApplicationStatus, number>();
  for (const status of STATUS_ORDER) statusCounts.set(status, 0);
  for (const application of applications) {
    statusCounts.set(application.applicationStatus, (statusCounts.get(application.applicationStatus) ?? 0) + 1);
  }

  const bandCounts = new Map<ScoreBand, number>();
  for (const band of SCORE_BANDS) bandCounts.set(band, 0);
  for (const application of applications) {
    const band = scoreBandFromFit(application.fitScore);
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1);
  }

  const jobCounts = new Map<string, { jobTitle: string; companyName: string; count: number }>();
  for (const application of applications) {
    const key = `${application.companyName}::${application.jobTitle}`;
    const existing = jobCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      jobCounts.set(key, {
        jobTitle: application.jobTitle,
        companyName: application.companyName,
        count: 1,
      });
    }
  }

  const analysisCounts = new Map<string, number>();
  for (const application of applications) {
    const status = application.analysisStatus || "pending";
    analysisCounts.set(status, (analysisCounts.get(status) ?? 0) + 1);
  }

  const workplaceCounts = new Map<string, number>();
  for (const job of jobs) {
    const type = job.workplaceType || "unspecified";
    workplaceCounts.set(type, (workplaceCounts.get(type) ?? 0) + 1);
  }

  const companyCounts = new Map<string, number>();
  for (const application of applications) {
    companyCounts.set(
      application.companyName,
      (companyCounts.get(application.companyName) ?? 0) + 1,
    );
  }

  const priorityCounts = new Map<ImprovementPriority, number>();
  for (const priority of ["low", "medium", "high"] as ImprovementPriority[]) {
    priorityCounts.set(priority, 0);
  }
  for (const application of applications) {
    const priority = application.applicationInsights?.improvementPriority;
    if (!priority) continue;
    priorityCounts.set(priority, (priorityCounts.get(priority) ?? 0) + 1);
  }

  const fitWeeks = new Map<string, { total: number; count: number }>();
  for (const application of applications) {
    if (application.fitScore === null) continue;
    const key = weekKey(new Date(application.appliedAt));
    const existing = fitWeeks.get(key) ?? { total: 0, count: 0 };
    existing.total += application.fitScore;
    existing.count += 1;
    fitWeeks.set(key, existing);
  }

  const jobBuckets = new Map<string, number>();
  for (const label of ["0", "1–3", "4–7", "8+"]) jobBuckets.set(label, 0);
  for (const job of jobs) {
    const count = job.applicationCount;
    const bucket = count === 0 ? "0" : count <= 3 ? "1–3" : count <= 7 ? "4–7" : "8+";
    jobBuckets.set(bucket, (jobBuckets.get(bucket) ?? 0) + 1);
  }

  const openJobs = jobs.filter((job) => job.status === "open").length;
  const closedJobs = jobs.length - openJobs;

  const funnelStages = [
    { stage: "Submitted", count: statusCounts.get("submitted") ?? 0 },
    { stage: "Under review", count: statusCounts.get("under_review") ?? 0 },
    { stage: "Shortlisted", count: statusCounts.get("shortlisted") ?? 0 },
    { stage: "Interview", count: statusCounts.get("interview") ?? 0 },
    { stage: "Hired", count: statusCounts.get("hired") ?? 0 },
  ];

  return {
    usersByRole: Array.from(roleCounts.entries()).map(([role, count]) => ({ role, count })),
    signupsByWeek: sortWeekEntries(signupWeeks),
    applicationsByWeek: sortWeekEntries(applicationWeeks),
    statusBreakdown: STATUS_ORDER.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    scoreBands: SCORE_BANDS.map((band) => ({
      band,
      count: bandCounts.get(band) ?? 0,
    })),
    topJobsByApplicants: Array.from(jobCounts.values())
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    analysisStatus: Array.from(analysisCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count),
    workplaceTypes: Array.from(workplaceCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count),
    topCompanies: Array.from(companyCounts.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    avgFitByJob: jobs
      .filter((job) => job.applicationCount > 0 && job.avgFitScore > 0)
      .sort((left, right) => right.avgFitScore - left.avgFitScore)
      .slice(0, 8)
      .map((job) => ({
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        avgFit: job.avgFitScore,
        applicants: job.applicationCount,
      })),
    hiringFunnel: funnelStages,
    applicationsPerJobBuckets: ["0", "1–3", "4–7", "8+"].map((bucket) => ({
      bucket,
      jobCount: jobBuckets.get(bucket) ?? 0,
    })),
    improvementPriority: (["low", "medium", "high"] as ImprovementPriority[]).map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    })),
    avgFitByWeek: Array.from(fitWeeks.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-8)
      .map(([week, stats]) => ({
        week,
        avgFit: Math.round(stats.total / stats.count),
        applications: stats.count,
      })),
    openVsClosedJobs: [
      { status: "Open", count: openJobs },
      { status: "Closed", count: closedJobs },
    ],
  };
}

function sortWeekEntries(map: Map<string, number>) {
  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-8)
    .map(([week, count]) => ({ week, count }));
}
