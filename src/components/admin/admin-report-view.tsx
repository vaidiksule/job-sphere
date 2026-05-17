"use client";

import Link from "next/link";
import { AdminChartsPanel } from "@/components/admin/admin-charts";
import { ExportPdfButton } from "@/components/admin/export-pdf-button";
import type { AdminDashboardData } from "@/lib/types";

export function AdminReportView({ data, generatedAt }: { data: AdminDashboardData; generatedAt: string }) {
  return (
    <div className="grid-bg min-h-screen px-4 py-6 sm:px-6 print:bg-white print:px-0">
      <div className="app-shell space-y-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-[var(--olive)] hover:underline">
            ← Back to admin
          </Link>
          <ExportPdfButton />
        </div>

        <section className="glass-card rounded-[32px] p-8 print:border print:shadow-none">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere</div>
          <h1 className="mt-4 text-4xl font-semibold">Admin platform report</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Generated {generatedAt}</p>
        </section>

        <section className="glass-card rounded-[28px] p-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold">Executive summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Total users" value={data.overview.totalUsers} />
            <SummaryItem label="Recruiters" value={data.overview.recruiters} />
            <SummaryItem label="Applicants" value={data.overview.applicants} />
            <SummaryItem label="Applications" value={data.overview.totalApplications} />
            <SummaryItem label="Open jobs" value={data.overview.openJobs} />
            <SummaryItem label="Total jobs" value={data.overview.totalJobs} />
            <SummaryItem label="Average fit" value={`${data.overview.avgFitScore}%`} />
            <SummaryItem label="Pending analyses" value={data.overview.pendingAnalyses} />
          </div>
        </section>

        <section className="glass-card rounded-[28px] p-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold">Key insights</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Hire rate" value={`${data.insights.hireRate}%`} />
            <SummaryItem label="Shortlist rate" value={`${data.insights.shortlistRate}%`} />
            <SummaryItem label="Interview rate" value={`${data.insights.interviewRate}%`} />
            <SummaryItem label="Analysis completion" value={`${data.insights.analysisCompletionRate}%`} />
            <SummaryItem label="Apps per job" value={data.insights.avgApplicantsPerJob} />
            <SummaryItem label="Apps per applicant" value={data.insights.avgApplicationsPerApplicant} />
            <SummaryItem label="High-fit (81+)" value={data.insights.highFitCandidates} />
            <SummaryItem label="Jobs with 0 apps" value={data.insights.jobsWithZeroApplicants} />
          </div>
        </section>

        <section className="glass-card rounded-[28px] p-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold">Application pipeline</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Processed" value={data.overview.processedApplications} />
            <SummaryItem label="Under review" value={data.overview.underReview} />
            <SummaryItem label="Shortlisted" value={data.overview.shortlisted} />
            <SummaryItem label="Hired" value={data.overview.hired} />
            <SummaryItem label="Submitted" value={data.overview.submitted} />
            <SummaryItem label="Interview" value={data.overview.interview} />
            <SummaryItem label="Rejected" value={data.overview.rejected} />
          </div>
        </section>

        <section className="page-break glass-card rounded-[28px] p-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <div className="mt-4">
            <AdminChartsPanel charts={data.charts} />
          </div>
        </section>

        <section className="page-break glass-card rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold">Top jobs by applicants</h2>
          <table className="mt-4 min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2">Applicants</th>
              </tr>
            </thead>
            <tbody>
              {data.charts.topJobsByApplicants.map((job) => (
                <tr key={`${job.companyName}-${job.jobTitle}`} className="border-b border-[var(--line)]/60">
                  <td className="py-2 pr-4">{job.jobTitle}</td>
                  <td className="py-2 pr-4">{job.companyName}</td>
                  <td className="py-2">{job.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="page-break glass-card rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold">User appendix</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">First 50 users on the platform</p>
          <table className="mt-4 min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.slice(0, 50).map((user) => (
                <tr key={user.id} className="border-b border-[var(--line)]/60">
                  <td className="py-2 pr-4">{user.name}</td>
                  <td className="py-2 pr-4">{user.email}</td>
                  <td className="py-2 pr-4 capitalize">{user.role ?? "—"}</td>
                  <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
