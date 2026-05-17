"use client";

import type { AdminInsights } from "@/lib/types";

export function AdminInsightsRow({ insights }: { insights: AdminInsights }) {
  const items = [
    { label: "Hire rate", value: `${insights.hireRate}%`, hint: "Hired ÷ all applications" },
    { label: "Shortlist rate", value: `${insights.shortlistRate}%`, hint: "Shortlisted applications" },
    { label: "Interview rate", value: `${insights.interviewRate}%`, hint: "In interview stage" },
    { label: "Analysis done", value: `${insights.analysisCompletionRate}%`, hint: "Resume analysis completed" },
    { label: "Apps per job", value: String(insights.avgApplicantsPerJob), hint: "Average applicants per posting" },
    {
      label: "Apps per applicant",
      value: String(insights.avgApplicationsPerApplicant),
      hint: "Average applications per candidate",
    },
    { label: "High-fit (81+)", value: String(insights.highFitCandidates), hint: "Candidates scoring 81 or above" },
    { label: "Jobs with 0 apps", value: String(insights.jobsWithZeroApplicants), hint: "Roles with no applicants yet" },
  ];

  return (
    <div className="glass-card rounded-[28px] p-6">
      <h2 className="text-xl font-semibold">Platform insights</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Conversion and engagement rates derived from live platform data.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            title={item.hint}
            className="rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-3"
          >
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
