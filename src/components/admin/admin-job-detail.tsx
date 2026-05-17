"use client";

import type { AdminApplicationListRow, AdminJobRow } from "@/lib/types";

type JobPipeline = {
  total: number;
  processed: number;
  underReview: number;
  shortlisted: number;
  hired: number;
  submitted: number;
  interview: number;
  rejected: number;
};

export function AdminJobDetail({
  job,
  applications,
  onClose,
  onOpenApplication,
}: {
  job: AdminJobRow;
  applications: AdminApplicationListRow[];
  onClose: () => void;
  onOpenApplication: (applicationId: string) => void;
}) {
  const pipeline = summarizeJobPipeline(applications);

  return (
    <div className="glass-card rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--olive)]">Job applicants</div>
          <h2 className="mt-2 text-2xl font-semibold">{job.jobTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {job.companyName} · {job.location} · Recruiter: {job.recruiterName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-white/70"
        >
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total applicants" value={pipeline.total} />
        <Stat label="Processed" value={pipeline.processed} />
        <Stat label="Under review" value={pipeline.underReview} />
        <Stat label="Shortlisted" value={pipeline.shortlisted} />
        <Stat label="Hired" value={pipeline.hired} />
        <Stat label="Submitted" value={pipeline.submitted} />
        <Stat label="Interview" value={pipeline.interview} />
        <Stat label="Rejected" value={pipeline.rejected} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--muted)]">
              <th className="py-2 pr-4">Candidate</th>
              <th className="py-2 pr-4">Fit</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Analysis</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length ? (
              applications.map((application) => (
                <tr key={application.id} className="border-b border-[var(--line)]/60">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{application.applicantName}</div>
                    <div className="text-xs text-[var(--muted)]">{application.applicantEmail}</div>
                  </td>
                  <td className="py-3 pr-4">{application.fitScore ?? "—"}%</td>
                  <td className="py-3 pr-4 capitalize">{application.applicationStatus.replace(/_/g, " ")}</td>
                  <td className="py-3 pr-4 capitalize">{application.analysisStatus}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onOpenApplication(application.id)}
                      className="text-sm font-semibold text-[var(--olive)] hover:underline"
                    >
                      View detail
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-[var(--muted)]">
                  No applicants for this job yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function summarizeJobPipeline(applications: AdminApplicationListRow[]): JobPipeline {
  return {
    total: applications.length,
    processed: applications.filter((item) => item.analysisStatus === "completed").length,
    underReview: applications.filter((item) => item.applicationStatus === "under_review").length,
    shortlisted: applications.filter((item) => item.applicationStatus === "shortlisted").length,
    hired: applications.filter((item) => item.applicationStatus === "hired").length,
    submitted: applications.filter((item) => item.applicationStatus === "submitted").length,
    interview: applications.filter((item) => item.applicationStatus === "interview").length,
    rejected: applications.filter((item) => item.applicationStatus === "rejected").length,
  };
}
