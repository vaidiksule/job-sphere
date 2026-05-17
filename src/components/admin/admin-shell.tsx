"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Briefcase,
  ChartColumnBig,
  FileText,
  LogOut,
  Users,
} from "lucide-react";
import { AdminApplicationDetail } from "@/components/admin/admin-application-detail";
import { AdminChartsPanel } from "@/components/admin/admin-charts";
import { AdminInsightsRow } from "@/components/admin/admin-insights-row";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import type {
  AdminApplicationListRow,
  AdminCharts,
  AdminInitialData,
  AdminJobRow,
  AdminUserRow,
} from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview", icon: ChartColumnBig },
  { id: "users", label: "Users", icon: Users },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "candidates", label: "Candidates", icon: FileText },
  { id: "activity", label: "Activity", icon: Activity },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminShell({ initial, username }: { initial: AdminInitialData; username: string }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [userQuery, setUserQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplicationListRow | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [jobs, setJobs] = useState<AdminJobRow[] | null>(null);
  const [applications, setApplications] = useState<AdminApplicationListRow[] | null>(null);
  const [tabLoading, setTabLoading] = useState<TabId | null>(null);
  const [charts, setCharts] = useState<AdminCharts | null>(initial.charts ?? null);
  const [chartsLoading, setChartsLoading] = useState(!initial.charts);

  const selectedJob = jobs?.find((job) => job.id === selectedJobId) ?? null;

  useEffect(() => {
    if (charts) return;

    void fetch("/api/admin/charts")
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok) setCharts(payload.charts as AdminCharts);
      })
      .finally(() => setChartsLoading(false));
  }, [charts]);

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      return;
    }

    let cancelled = false;
    setLoadingApplication(true);

    void fetch(`/api/admin/applications/${selectedApplicationId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setSelectedApplication(null);
          return;
        }
        setSelectedApplication(payload.application as AdminApplicationListRow);
      })
      .catch(() => {
        if (!cancelled) setSelectedApplication(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingApplication(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedApplicationId]);
  const selectedJobApplications = useMemo(
    () =>
      selectedJobId && applications
        ? applications.filter((application) => application.jobId === selectedJobId)
        : [],
    [applications, selectedJobId],
  );

  useEffect(() => {
    if (tab === "users" && users === null) {
      setTabLoading("users");
      void fetch("/api/admin/users")
        .then(async (response) => {
          const payload = await response.json();
          if (response.ok) setUsers(payload.users as AdminUserRow[]);
        })
        .finally(() => setTabLoading(null));
    }
  }, [tab, users]);

  useEffect(() => {
    if (tab === "jobs" && jobs === null) {
      setTabLoading("jobs");
      void fetch("/api/admin/jobs")
        .then(async (response) => {
          const payload = await response.json();
          if (response.ok) setJobs(payload.jobs as AdminJobRow[]);
        })
        .finally(() => setTabLoading(null));
    }
  }, [tab, jobs]);

  useEffect(() => {
    if ((tab === "candidates" || selectedJobId) && applications === null) {
      setTabLoading(tab === "candidates" ? "candidates" : "jobs");
      void fetch("/api/admin/applications")
        .then(async (response) => {
          const payload = await response.json();
          if (response.ok) setApplications(payload.applications as AdminApplicationListRow[]);
        })
        .finally(() => setTabLoading(null));
    }
  }, [tab, applications, selectedJobId]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!users) return [];
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.role ?? "").toLowerCase().includes(query),
    );
  }, [users, userQuery]);

  const filteredApplications = useMemo(() => {
    const query = candidateQuery.trim().toLowerCase();
    if (!applications) return [];
    return applications.filter((application) => {
      if (statusFilter !== "all" && application.applicationStatus !== statusFilter) return false;
      if (!query) return true;
      return (
        application.applicantName.toLowerCase().includes(query) ||
        application.applicantEmail.toLowerCase().includes(query) ||
        application.jobTitle.toLowerCase().includes(query) ||
        application.companyName.toLowerCase().includes(query)
      );
    });
  }, [applications, candidateQuery, statusFilter]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <div className="grid-bg min-h-screen px-4 py-5 sm:px-6">
      <div className="app-shell space-y-5">
        <header className="glass-card flex flex-col gap-4 rounded-[32px] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere Admin</div>
            <h1 className="mt-2 text-3xl font-semibold">Platform control center</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Signed in as {username}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/report"
              className="rounded-full border border-[var(--line)] bg-white/70 px-5 py-2.5 text-sm font-semibold hover:bg-white"
            >
              Full report
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <aside className="glass-card h-fit rounded-[28px] p-4">
            <div className="space-y-2">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      active ? "bg-[var(--ink)] text-white" : "hover:bg-white/70"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            {selectedApplicationId && loadingApplication ? (
              <div className="glass-card rounded-[28px] p-6 text-sm text-[var(--muted)]">Loading application details…</div>
            ) : null}

            {selectedApplication ? (
              <AdminApplicationDetail
                application={selectedApplication}
                onClose={() => {
                  setSelectedApplicationId(null);
                  setSelectedApplication(null);
                }}
              />
            ) : null}

            {!selectedApplication && selectedJob ? (
              <AdminJobDetail
                job={selectedJob}
                applications={selectedJobApplications}
                onClose={() => setSelectedJobId(null)}
                onOpenApplication={(applicationId) => {
                  setSelectedJobId(null);
                  setSelectedApplicationId(applicationId);
                }}
              />
            ) : null}

            {tab === "overview" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Total users" value={initial.overview.totalUsers} />
                  <MetricCard label="Recruiters" value={initial.overview.recruiters} />
                  <MetricCard label="Applicants" value={initial.overview.applicants} />
                  <MetricCard label="Applications" value={initial.overview.totalApplications} />
                  <MetricCard label="Open jobs" value={initial.overview.openJobs} />
                  <MetricCard label="Total jobs" value={initial.overview.totalJobs} />
                  <MetricCard label="Avg fit" value={`${initial.overview.avgFitScore}%`} />
                  <MetricCard label="Pending analysis" value={initial.overview.pendingAnalyses} />
                </div>

                <div className="glass-card rounded-[28px] p-6">
                  <h2 className="text-xl font-semibold">Application pipeline</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Processed means analysis completed. Open a job or candidate from the Jobs / Candidates tabs for details.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Processed" value={initial.overview.processedApplications} />
                    <MetricCard label="Under review" value={initial.overview.underReview} />
                    <MetricCard label="Shortlisted" value={initial.overview.shortlisted} />
                    <MetricCard label="Hired" value={initial.overview.hired} />
                    <MetricCard label="Submitted" value={initial.overview.submitted} />
                    <MetricCard label="Interview" value={initial.overview.interview} />
                    <MetricCard label="Rejected" value={initial.overview.rejected} />
                  </div>
                </div>

                <AdminInsightsRow insights={initial.insights} />

                {chartsLoading ? (
                  <p className="text-sm text-[var(--muted)]">Loading charts…</p>
                ) : charts ? (
                  <AdminChartsPanel charts={charts} />
                ) : (
                  <p className="text-sm text-[var(--muted)]">Charts could not be loaded.</p>
                )}
              </>
            ) : null}

            {tab === "users" ? (
              <DataPanel title="All users" subtitle="Who is on the platform and what they are doing">
                {tabLoading === "users" ? (
                  <p className="mb-4 text-sm text-[var(--muted)]">Loading users…</p>
                ) : null}
                <input
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Search by name, email, or role"
                  className="field-input mb-4"
                />
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Jobs</th>
                        <th className="py-2 pr-4">Applications</th>
                        <th className="py-2">Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-[var(--line)]/60">
                          <td className="py-3 pr-4 font-medium">{user.name}</td>
                          <td className="py-3 pr-4 text-[var(--muted)]">{user.email}</td>
                          <td className="py-3 pr-4 capitalize">{user.role ?? "—"}</td>
                          <td className="py-3 pr-4">{user.jobsPosted}</td>
                          <td className="py-3 pr-4">{user.applicationsSubmitted}</td>
                          <td className="py-3 text-[var(--muted)]">{formatDate(user.lastActiveAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataPanel>
            ) : null}

            {tab === "jobs" ? (
              <DataPanel title="All job postings" subtitle="Roles on the platform and resume volume per job">
                {tabLoading === "jobs" ? (
                  <p className="mb-4 text-sm text-[var(--muted)]">Loading jobs…</p>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                        <th className="py-2 pr-4">Job</th>
                        <th className="py-2 pr-4">Company</th>
                        <th className="py-2 pr-4">Recruiter</th>
                        <th className="py-2 pr-4">Resumes</th>
                        <th className="py-2 pr-4">Avg fit</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(jobs ?? []).map((job) => (
                        <tr key={job.id} className="border-b border-[var(--line)]/60">
                          <td className="py-3 pr-4 font-medium">{job.jobTitle}</td>
                          <td className="py-3 pr-4">{job.companyName}</td>
                          <td className="py-3 pr-4 text-[var(--muted)]">{job.recruiterName}</td>
                          <td className="py-3 pr-4">{job.applicationCount}</td>
                          <td className="py-3 pr-4">{job.avgFitScore}%</td>
                          <td className="py-3 capitalize">{job.status}</td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedApplicationId(null);
                                setSelectedJobId(job.id);
                              }}
                              className="text-sm font-semibold text-[var(--olive)] hover:underline"
                            >
                              View applicants
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataPanel>
            ) : null}

            {tab === "candidates" ? (
              <DataPanel title="All candidates" subtitle="Applications and fit scores across every role">
                {tabLoading === "candidates" ? (
                  <p className="mb-4 text-sm text-[var(--muted)]">Loading candidates…</p>
                ) : null}
                <div className="mb-4 flex flex-wrap gap-3">
                  <input
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="Search candidate, email, or job"
                    className="field-input min-w-[220px] flex-1"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="field-input w-auto min-w-[160px]"
                  >
                    <option value="all">All statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                        <th className="py-2 pr-4">Candidate</th>
                        <th className="py-2 pr-4">Job</th>
                        <th className="py-2 pr-4">Fit</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Analysis</th>
                        <th className="py-2 pr-4">Applied</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((application) => (
                        <tr key={application.id} className="border-b border-[var(--line)]/60">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{application.applicantName}</div>
                            <div className="text-xs text-[var(--muted)]">{application.applicantEmail}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div>{application.jobTitle}</div>
                            <div className="text-xs text-[var(--muted)]">{application.companyName}</div>
                          </td>
                          <td className="py-3 pr-4">{application.fitScore ?? "—"}%</td>
                          <td className="py-3 pr-4 capitalize">{application.applicationStatus.replace("_", " ")}</td>
                          <td className="py-3 pr-4 capitalize">{application.analysisStatus}</td>
                          <td className="py-3 pr-4 text-[var(--muted)]">{formatDate(application.appliedAt)}</td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobId(null);
                                setSelectedApplicationId(application.id);
                              }}
                              className="text-sm font-semibold text-[var(--olive)] hover:underline"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataPanel>
            ) : null}

            {tab === "activity" ? (
              <DataPanel title="Recent activity" subtitle="Signups and applications across the platform">
                <div className="space-y-3">
                  {initial.activity.length ? (
                    initial.activity.map((item) => (
                      <div key={item.id} className="rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{item.title}</div>
                            <div className="text-sm text-[var(--muted)]">{item.subtitle}</div>
                          </div>
                          <div className="text-xs uppercase tracking-wide text-[var(--olive)]">{item.type}</div>
                        </div>
                        <div className="mt-2 text-xs text-[var(--muted)]">{formatDate(item.at)}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No activity yet.</p>
                  )}
                </div>
              </DataPanel>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card rounded-[24px] p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function DataPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-[30px] p-6 sm:p-7">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
