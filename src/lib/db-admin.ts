import { ensureDatabase, sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/admin-password";
import type {
  AdminActivityItem,
  AdminApplicationListRow,
  AdminCharts,
  AdminDashboardData,
  AdminJobRow,
  AdminOverview,
  AdminUserRow,
  ApplicationStatus,
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
  await ensureAdminAccount("vaidikadmin", "vaidikadmin");

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    await ensureAdminAccount(username, password);
  }
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
  const valid = await verifyPassword(password, account.password_hash);
  if (!valid) return null;
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
        COUNT(*) FILTER (WHERE analysis_status IS DISTINCT FROM 'completed')::int AS pending_analyses
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
    status: String(row.status),
    recruiterName: String(row.recruiter_name),
    recruiterEmail: String(row.recruiter_email),
    applicationCount: Number(row.application_count ?? 0),
    avgFitScore: Number(row.avg_fit_score ?? 0),
    createdAt: String(row.created_at),
  }));

  const adminApplications: AdminApplicationListRow[] = applications.map((row) => ({
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
  }));

  const charts = buildAdminCharts(adminUsers, adminApplications);

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
    charts,
    users: adminUsers,
    jobs: adminJobs,
    applications: adminApplications,
    activity,
  };
}

function buildAdminCharts(users: AdminUserRow[], applications: AdminApplicationListRow[]): AdminCharts {
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
  };
}

function sortWeekEntries(map: Map<string, number>) {
  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-8)
    .map(([week, count]) => ({ week, count }));
}
