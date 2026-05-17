"use client";

import type { AdminApplicationListRow } from "@/lib/types";

export function AdminApplicationDetail({
  application,
  onClose,
}: {
  application: AdminApplicationListRow;
  onClose: () => void;
}) {
  const insights = application.applicationInsights;
  const breakdown = application.matchBreakdown;

  return (
    <div className="glass-card rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--olive)]">Application detail</div>
          <h2 className="mt-2 text-2xl font-semibold">{application.applicantName}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{application.applicantEmail}</p>
          <p className="mt-2 text-sm">
            {application.jobTitle} · {application.companyName}
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailMetric label="Fit score" value={application.fitScore !== null ? `${application.fitScore}%` : "—"} />
        <DetailMetric label="Pipeline status" value={formatStatus(application.applicationStatus)} />
        <DetailMetric label="Analysis" value={application.analysisStatus} />
        <DetailMetric label="Applied" value={new Date(application.appliedAt).toLocaleString()} />
      </div>

      <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
        {application.fitSummary ||
          insights?.candidateSummary ||
          "No fit summary available for this application yet."}
      </p>

      {insights ? (
        <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
          <div className="text-sm font-semibold">Hiring recommendation</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{insights.hiringRecommendation}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ListBlock title="Strengths" items={application.strengths} />
        <ListBlock title="Gaps" items={application.gaps} />
        <ListBlock title="Matching skills" items={insights?.matchingSkills ?? []} />
        <ListBlock title="Missing critical skills" items={insights?.missingCriticalSkills ?? []} />
      </div>

      {breakdown ? (
        <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
          <div className="text-sm font-semibold">Match breakdown</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <BreakdownItem label="Skill match" value={breakdown.skillMatch} />
            <BreakdownItem label="Experience" value={breakdown.experienceMatch} />
            <BreakdownItem label="Education" value={breakdown.educationMatch} />
            <BreakdownItem label="Role alignment" value={breakdown.roleAlignment} />
            <BreakdownItem label="Readiness" value={breakdown.overallReadiness} />
            <BreakdownItem label="ATS coverage" value={breakdown.atsKeywordCoverage} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-semibold capitalize">{value}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
        {items.length ? items.map((item) => <li key={item}>- {item}</li>) : <li>- None listed</li>}
      </ul>
    </div>
  );
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-[var(--card-strong)] px-3 py-2 text-sm">
      <span>{label}</span>
      <span className="font-semibold">{value}%</span>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
