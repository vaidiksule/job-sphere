"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChartColumnBig,
  ChevronDown,
  CircleDot,
  FileSpreadsheet,
  LogOut,
  Search,
  SendHorizontal,
  Sparkles,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type {
  ApplicationInsights,
  ApplicationRow,
  ApplicationStatus,
  DashboardData,
  JobRow,
  MatchBreakdown,
  ScoreBand,
} from "@/lib/types";
import { cn, formatSalaryRange } from "@/lib/utils";

const recruiterTabs = [
  { id: "overview", label: "Overview", icon: ChartColumnBig },
  { id: "post", label: "Jobs", icon: BriefcaseBusiness },
  { id: "pipeline", label: "Applications", icon: Users },
] as const;

const applicantTabs = [
  { id: "discover", label: "Discover", icon: Search },
  { id: "applied", label: "My applications", icon: FileSpreadsheet },
] as const;

const statusActions: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "under_review", label: "Under review" },
  { value: "shortlisted", label: "Shortlist" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Reject" },
  { value: "hired", label: "Hire" },
];

const scoreBandOrder: ScoreBand[] = ["0-40", "41-60", "61-80", "81-100"];

type JobFormState = {
  companyName: string;
  jobTitle: string;
  location: string;
  workplaceType: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  description: string;
  requirements: string;
  responsibilities: string;
};

export function DashboardShell({ data }: { data: DashboardData }) {
  const router = useRouter();
  const isRecruiter = data.user.role === "recruiter";
  const [tab, setTab] = useState<string>(isRecruiter ? "overview" : "discover");
  const [status, setStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [viewJobId, setViewJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<JobFormState>({
    companyName: data.user.companyName ?? "",
    jobTitle: "",
    location: "Remote",
    workplaceType: "Hybrid",
    employmentType: "Full-time",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    description: "",
    requirements: "",
    responsibilities: "",
  });

  const activeJob = useMemo(() => data.jobs.find((job) => job.id === applyJobId) ?? null, [applyJobId, data.jobs]);
  const viewingJob = useMemo(() => {
    if (!viewJobId) return null;
    return data.jobs.find((job) => job.id === viewJobId) ?? data.recruiterJobs.find((job) => job.id === viewJobId) ?? null;
  }, [viewJobId, data.jobs, data.recruiterJobs]);
  const viewingJobApplied = viewingJob
    ? data.applicantApplications.some((application) => application.job_id === viewingJob.id)
    : false;
  const pendingAnalyses = data.recruiterApplications.filter((application) => application.analysis_status !== "completed").length;

  useEffect(() => {
    if (!isRecruiter || pendingAnalyses === 0) return;

    let cancelled = false;

    async function analyzePending() {
      setAnalyzing(true);
      setStatus(`Updating ${pendingAnalyses} application${pendingAnalyses === 1 ? "" : "s"}...`);

      try {
        const response = await fetch("/api/applications/analyze-pending", { method: "POST" });
        const payload = await readJsonSafely(response);

        if (cancelled) return;

        if (!response.ok) {
          setStatus(payload.error ?? "Could not update applications.");
          return;
        }

        if (payload.processedCount > 0) {
          setStatus(`Updated ${payload.processedCount} application${payload.processedCount === 1 ? "" : "s"}.`);
          router.refresh();
        } else {
          setStatus("");
        }
      } catch {
        if (!cancelled) setStatus("Could not update applications.");
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }

    analyzePending();
    return () => {
      cancelled = true;
    };
  }, [isRecruiter, pendingAnalyses, router]);

  async function submitJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...jobForm,
        salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : null,
        salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : null,
      }),
    });

    const payload = await readJsonSafely(response);
    if (!response.ok) {
      setStatus(payload.error ?? "Could not create the job.");
      setSubmitting(false);
      return;
    }

    setStatus("Job posted successfully.");
    setSubmitting(false);
    setJobForm((current) => ({
      ...current,
      jobTitle: "",
      description: "",
      requirements: "",
      responsibilities: "",
      salaryMin: "",
      salaryMax: "",
    }));
    router.refresh();
    setShowPostForm(false);
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!applyJobId) return;

    const form = new FormData(event.currentTarget);
    const file = form.get("resume");
    setSubmitting(true);
    setStatus("");
    setUploadError("");

    if (!(file instanceof File)) {
      setUploadError("Please choose a resume file.");
      setSubmitting(false);
      return;
    }

    const fileName = file.name.toLowerCase();
    const supported = [".png", ".jpg", ".jpeg", ".webp", ".docx", ".txt", ".pdf"];
    if (!supported.some((extension) => fileName.endsWith(extension))) {
      setUploadError("Please upload a resume image (PNG/JPG/WEBP), DOCX, TXT, or PDF.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${applyJobId}/apply`, { method: "POST", body: form });
      const payload = await readJsonSafely(response);

      if (!response.ok) {
        setUploadError(payload.error ?? "Could not submit application.");
        setSubmitting(false);
        return;
      }

      setStatus("Resume uploaded successfully.");
      setApplyJobId(null);
      setSubmitting(false);
      router.refresh();
      setTab("applied");
    } catch {
      setUploadError("Something went wrong while uploading the resume. Please try again.");
      setSubmitting(false);
    }
  }

  async function updateCandidateStatus(applicationId: string, nextStatus: ApplicationStatus) {
    setUpdatingApplicationId(applicationId);
    setStatus("");

    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await readJsonSafely(response);

      if (!response.ok) {
        setStatus(payload.error ?? "Could not update candidate status.");
        setUpdatingApplicationId(null);
        return;
      }

      setStatus(`Candidate moved to ${statusLabel(nextStatus)}.`);
      router.refresh();
    } catch {
      setStatus("Could not update candidate status.");
    } finally {
      setUpdatingApplicationId(null);
    }
  }

  return (
    <div className="grid-bg min-h-screen px-4 py-5 sm:px-6">
      <div className="app-shell space-y-5">
        <header className="glass-card flex flex-col gap-6 rounded-[32px] p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere</div>
            <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
              {isRecruiter ? `${data.user.companyName ?? data.user.name} workspace` : `Welcome back, ${data.user.name}`}
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              {isRecruiter
                ? "Your hiring intelligence dashboard now surfaces much deeper fit analytics, score distributions, candidate dossiers, and role-level signals."
                : "Your application reports now include richer fit analytics, status tracking, score breakdowns, and next-step guidance for each role."}
            </p>
          </div>
          <div className="grid w-full gap-3 grid-cols-2 sm:grid-cols-4 lg:w-auto lg:min-w-[42rem]">
            <MetricCard label={isRecruiter ? "Open roles" : "Jobs live"} value={data.metrics.openRoles} />
            <MetricCard label={isRecruiter ? "Applications" : "Applications sent"} value={data.metrics.totalApplications} />
            <MetricCard label="Avg fit" value={`${data.metrics.avgFitScore}%`} />
            <MetricCard label={isRecruiter ? "Pending review" : "Active statuses"} value={isRecruiter ? pendingAnalyses : data.applicantApplications.length} />
          </div>
        </header>

        <div className="grid gap-5 items-start lg:grid-cols-[250px_1fr]">
          <aside className="glass-card rounded-[28px] p-4">
            <div className="space-y-2">
              {(isRecruiter ? recruiterTabs : applicantTabs).map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                      active ? "bg-[var(--ink)] text-white" : "hover:bg-white/70",
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 rounded-[24px] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
              <div className="font-semibold text-[var(--ink)]">{isRecruiter ? "Recruiter mode" : "Applicant mode"}</div>
              <p className="mt-2">
                {isRecruiter
                  ? "Expect long candidate dossiers, score grids, top matches, missing skills, interview prompts, and role-level analytics."
                  : "Expect long role reports, status progression, fit analytics, matching reasons, missing keywords, and next-step guidance."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-3 font-semibold hover:bg-white/70"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </aside>

          <section className="space-y-5">
            {status ? <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--ink)]">{status}</div> : null}
            {isRecruiter && tab === "overview" ? <RecruiterOverview data={data} /> : null}
            {isRecruiter && tab === "post" && !showPostForm ? (
              <RecruiterJobsList
                jobs={data.recruiterJobs}
                onNewJob={() => setShowPostForm(true)}
                onJobSelect={(id) => {
                  setPipelineFilter(id);
                  setTab("pipeline");
                }}
                onViewDetails={(id) => setViewJobId(id)}
              />
            ) : null}
            {isRecruiter && tab === "post" && showPostForm ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  &larr; Back to jobs
                </button>
                <RecruiterPostForm form={jobForm} setForm={setJobForm} onSubmit={submitJob} submitting={submitting} />
              </div>
            ) : null}
            {isRecruiter && tab === "pipeline" ? (
              <RecruiterPipeline 
                data={data} 
                updatingApplicationId={updatingApplicationId} 
                onUpdateStatus={updateCandidateStatus} 
                filter={pipelineFilter} 
                setFilter={setPipelineFilter} 
              />
            ) : null}
            {!isRecruiter && tab === "discover" ? (
              <ApplicantDiscover
                jobs={data.jobs}
                appliedJobIds={data.applicantApplications.map((application) => application.job_id)}
                onApply={setApplyJobId}
                onViewDetails={setViewJobId}
              />
            ) : null}
            {!isRecruiter && tab === "applied" ? <ApplicantApplications data={data} /> : null}
          </section>
        </div>
      </div>

      {activeJob ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,24,17,0.45)] p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--olive)]">Apply</div>
                <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-semibold">{activeJob.job_title}</h2>
                <p className="mt-2 text-[var(--muted)]">
                  {activeJob.company_name} / {activeJob.location} / {formatSalaryRange(activeJob.salary_min, activeJob.salary_max, activeJob.salary_currency)}
                </p>
              </div>
              <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2" onClick={() => setApplyJobId(null)}>
                Close
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={submitApplication}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">Resume file</span>
                <input name="resume" required type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt" className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3" />
              </label>
              {uploadError ? <p className="text-sm text-[var(--danger)]">{uploadError}</p> : null}
              <div className="rounded-[22px] bg-[var(--card-strong)] p-4 text-sm text-[var(--muted)]">
                Upload your resume to unlock the full role report after analysis, including detailed category scores, fit explanations, keyword coverage, and improvement actions.
              </div>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white disabled:opacity-50">
                <Upload size={16} />
                {submitting ? "Uploading..." : "Submit application"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {viewingJob ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,24,17,0.45)] p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-2xl sm:p-8 my-8 relative">
            <div className="sticky top-0 right-0 flex justify-end">
               <button type="button" className="rounded-full bg-white/80 border border-[var(--line)] px-4 py-2 hover:bg-white" onClick={() => setViewJobId(null)}>Close x</button>
            </div>
            
            <div className="mb-6">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--olive)]">Job details</div>
              <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-semibold">{viewingJob.job_title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                <span className="rounded bg-black/5 px-2 py-1">{viewingJob.employment_type}</span>
                <span className="rounded bg-black/5 px-2 py-1">{viewingJob.workplace_type}</span>
                <span className="rounded bg-black/5 px-2 py-1">{viewingJob.location}</span>
                <span className="rounded bg-black/5 px-2 py-1">{formatSalaryRange(viewingJob.salary_min, viewingJob.salary_max, viewingJob.salary_currency)}</span>
              </div>
            </div>

            <div className="space-y-6 text-sm text-[var(--ink)]">
              <div>
                <h3 className="font-semibold text-lg mb-2">Job Description</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{viewingJob.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Requirements</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{viewingJob.requirements}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Responsibilities</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{viewingJob.responsibilities}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecruiterJobsList({ jobs, onNewJob, onJobSelect, onViewDetails }: { jobs: DashboardData['recruiterJobs']; onNewJob: () => void; onJobSelect: (id: string) => void; onViewDetails: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 glass-card rounded-[24px] p-6">
        <div>
          <h2 className="text-2xl font-semibold">Your posted jobs</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your active roles and create new ones.</p>
        </div>
        <button type="button" onClick={onNewJob} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white">
          <BriefcaseBusiness size={16} />
          <span>Post new job</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.length ? jobs.map((job) => (
          <article 
            key={job.id} 
            className="text-left glass-card rounded-[24px] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-lg">{job.job_title}</div>
                  <div className="text-sm text-[var(--muted)] mt-1">{job.company_name} / {job.location}</div>
                </div>
                <div className="rounded-full bg-[var(--card-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-wider">{job.status}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded bg-white/50 px-2 py-1">{job.employment_type}</span>
                <span className="rounded bg-white/50 px-2 py-1">{job.workplace_type}</span>
                <span className="rounded bg-white/50 px-2 py-1">{new Date(job.created_at as string).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 border-t border-[var(--line)] pt-4 flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--olive)]">{job.application_count ?? 0} applications</span>
                <span className="font-semibold">{job.avg_fit_score ?? 0}% avg fit</span>
              </div>
            </div>
            
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => onJobSelect(job.id)} className="rounded-full bg-[var(--ink)] text-white hover:opacity-90 py-2 px-3 text-sm font-semibold transition text-center">
                Review applicants
              </button>
              <button onClick={() => onViewDetails(job.id)} className="rounded-full border border-[var(--line)] bg-white/50 hover:bg-white py-2 px-3 text-sm font-semibold transition text-center">
                Job details
              </button>
            </div>
          </article>
        )) : (
          <div className="col-span-full rounded-[24px] border border-[var(--line)] bg-white/60 py-12 text-center">
            <h3 className="text-lg font-semibold text-[var(--ink)]">No jobs posted yet</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">You haven't published any roles. Create one to start receiving applications.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecruiterOverview({ data }: { data: DashboardData }) {
  const statusCounts = countStatuses(data.recruiterApplications);
  const topCandidates = [...data.recruiterApplications]
    .filter((application) => application.analysis_status === "completed")
    .sort((left, right) => Number(right.fit_score ?? 0) - Number(left.fit_score ?? 0))
    .slice(0, 5);
  const skillGapMap = countListItems(data.recruiterApplications.flatMap((application) => application.application_insights?.missingCriticalSkills ?? application.gaps));
  const matchedSkillMap = countListItems(data.recruiterApplications.flatMap((application) => application.application_insights?.matchingSkills ?? application.strengths));
  const scoreBandCounts = countScoreBands(data.recruiterApplications);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Submitted" value={statusCounts.submitted} />
        <MetricCard label="Shortlisted" value={statusCounts.shortlisted} />
        <MetricCard label="Interview" value={statusCounts.interview} />
        <MetricCard label="Hired" value={statusCounts.hired} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="glass-card rounded-[30px] p-6 sm:p-7">
            <div className="flex items-center gap-2 text-[var(--olive)]">
              <BarChart3 size={18} />
              <span className="font-mono text-xs uppercase tracking-[0.3em]">Hiring intelligence</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Per-role fit analytics</h2>
            <div className="mt-5 space-y-4">
              {data.recruiterJobs.length ? (
                data.recruiterJobs.map((job) => {
                  const jobApplications = data.recruiterApplications.filter((application) => application.job_id === job.id);
                  const readiness = average(jobApplications.map((application) => application.match_breakdown?.overallReadiness ?? 0));
                  const alignment = average(jobApplications.map((application) => application.match_breakdown?.roleAlignment ?? 0));

                  return (
                    <div key={job.id} className="rounded-[24px] border border-[var(--line)] bg-white/72 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold">{job.job_title}</div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            {job.company_name} / {job.location} / {job.workplace_type}
                          </div>
                        </div>
                        <div className="rounded-full bg-[var(--card-strong)] px-4 py-2 text-sm font-semibold">
                          {jobApplications.length} applicants
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <MiniMetric label="Avg fit" value={`${job.avg_fit_score ?? 0}%`} />
                        <MiniMetric label="Alignment" value={`${alignment}%`} />
                        <MiniMetric label="Readiness" value={`${readiness}%`} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState title="No roles yet" text="Create your first role and this overview will turn into a long analytics feed." />
              )}
            </div>
          </div>

          <div className="glass-card rounded-[30px] p-6 sm:p-7">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--olive)]">Score distribution</div>
            <p className="mt-2 text-sm text-[var(--muted)]">How applicant fit scores are spread across your pipeline</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {scoreBandOrder.map((band) => (
                <MiniMetric key={band} label={band} value={scoreBandCounts[band]} />
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[30px] p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[var(--olive)]">
            <Sparkles size={18} />
            <span className="font-mono text-xs uppercase tracking-[0.3em]">Top candidates</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Highest-fit applicants across your open roles</p>
          <div className="mt-5 space-y-4">
            {topCandidates.length ? (
              topCandidates.map((application) => (
                <div key={application.id} className="rounded-[22px] border border-[var(--line)] bg-white/72 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{application.applicant_name}</div>
                      <div className="text-sm text-[var(--muted)]">{application.job_title}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={application.application_status} />
                      <ScorePill value={application.fit_score ?? 0} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {application.application_insights?.hiringRecommendation || application.fit_summary || "Detailed recommendation pending."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Top candidate signals appear here once analyzed applications exist.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <InsightBucketCard
          title="Most common missing skills"
          subtitle="Signals that repeatedly lower candidate fit across applicants"
          items={topEntries(skillGapMap, 8)}
        />
        <InsightBucketCard
          title="Most matched skills"
          subtitle="Signals most often found in stronger resumes"
          items={topEntries(matchedSkillMap, 8)}
        />
      </section>
    </div>
  );
}

function RecruiterPostForm({
  form,
  setForm,
  onSubmit,
  submitting,
}: {
  form: JobFormState;
  setForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  const update = (key: keyof JobFormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={onSubmit} className="glass-card rounded-[30px] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[var(--olive)]">
        <SendHorizontal size={18} />
        <span className="font-mono text-xs uppercase tracking-[0.3em]">Structured job post</span>
      </div>
      <h2 className="mt-4 text-3xl font-semibold">Publish a new role</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Company name"><input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} required className="field-input" /></Field>
        <Field label="Job title"><input value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} required className="field-input" /></Field>
        <Field label="Location"><input value={form.location} onChange={(event) => update("location", event.target.value)} required className="field-input" /></Field>
        <Field label="Workplace type"><select value={form.workplaceType} onChange={(event) => update("workplaceType", event.target.value)} className="field-input"><option>Remote</option><option>Hybrid</option><option>On-site</option></select></Field>
        <Field label="Employment type"><select value={form.employmentType} onChange={(event) => update("employmentType", event.target.value)} className="field-input"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field>
        <Field label="Currency"><input value={form.salaryCurrency} onChange={(event) => update("salaryCurrency", event.target.value.toUpperCase())} className="field-input" /></Field>
        <Field label="Salary min"><input type="number" value={form.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} className="field-input" /></Field>
        <Field label="Salary max"><input type="number" value={form.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} className="field-input" /></Field>
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Job description"><textarea value={form.description} onChange={(event) => update("description", event.target.value)} required rows={5} className="field-input" /></Field>
        <Field label="Requirements"><textarea value={form.requirements} onChange={(event) => update("requirements", event.target.value)} required rows={5} className="field-input" /></Field>
        <Field label="Responsibilities"><textarea value={form.responsibilities} onChange={(event) => update("responsibilities", event.target.value)} required rows={5} className="field-input" /></Field>
      </div>
      <button type="submit" disabled={submitting} className="mt-6 rounded-full bg-[var(--ink)] px-6 py-3 font-semibold text-white disabled:opacity-50">
        {submitting ? "Posting role..." : "Post job"}
      </button>
    </form>
  );
}

function RecruiterPipeline({
  data,
  updatingApplicationId,
  onUpdateStatus,
  filter,
  setFilter
}: {
  data: DashboardData;
  updatingApplicationId: string | null;
  onUpdateStatus: (applicationId: string, nextStatus: ApplicationStatus) => Promise<void>;
  filter: string;
  setFilter: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredApplications = (filter === "all" ? data.recruiterApplications : data.recruiterApplications.filter(a => a.job_id === filter))
    .filter(a => !searchQuery.trim() || a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) || a.applicant_email.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-wrap items-center gap-4 justify-between rounded-[24px] p-5">
        <div>
          <div className="font-semibold text-[var(--ink)]">Filter candidates</div>
          <p className="mt-1 text-sm text-[var(--muted)]">Search by name or select a role to view specific applicants.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
             <input type="text" placeholder="Search name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-[220px] rounded-[16px] pl-10 pr-4 py-3 border border-[var(--line)] bg-white text-sm focus:outline-none" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:w-auto rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-sm focus:outline-none">
            <option value="all">All published roles</option>
            {data.recruiterJobs.map(job => (
              <option key={job.id} value={job.id}>{job.job_title}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredApplications.length ? (
        filteredApplications.map((application) => (
          <CandidateDossier
            key={application.id}
            application={application}
            updatingApplicationId={updatingApplicationId}
            onUpdateStatus={onUpdateStatus}
          />
        ))
      ) : (
        <EmptyState title="No applications yet" text="Share a job link with applicants and this space will grow into a long candidate dossier view." />
      )}
    </div>
  );
}

function CandidateDossier({
  application,
  updatingApplicationId,
  onUpdateStatus,
}: {
  application: ApplicationRow;
  updatingApplicationId: string | null;
  onUpdateStatus: (applicationId: string, nextStatus: ApplicationStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = application.match_breakdown;
  const insights = application.application_insights;
  const parsedResume = application.structured_resume;

  return (
    <article className="glass-card rounded-[28px] overflow-hidden transition-colors">
      <div 
        className="flex flex-wrap items-start justify-between gap-4 p-6 cursor-pointer hover:bg-white/40 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="text-2xl font-semibold">{application.applicant_name}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {application.applicant_email} / Applied for {application.job_title} at {application.company_name}
          </div>
          <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
            {insights?.candidateSummary || application.fit_summary || "Candidate summary will appear after analysis completes."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {application.resume_url && (
            <a 
              href={application.resume_url} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mr-2 text-sm font-semibold text-[var(--ink)] hover:underline border border-[var(--line)] rounded-full px-3 py-1 bg-white/50"
            >
              View original resume
            </a>
          )}
          <StatusBadge status={application.application_status} />
          <ScorePill value={application.fit_score ?? 0} />
          <TonePill label={`Band ${insights?.scoreBand ?? scoreBandFor(application.fit_score ?? 0)}`} />
          <button className="ml-2 flex items-center justify-center text-[var(--ink)]">
            <ChevronDown size={20} className={cn("transition-transform duration-300", expanded ? "rotate-180" : "rotate-0")} />
          </button>
        </div>
      </div>

      <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="border-t border-[var(--line)] bg-[rgba(255,255,255,0.2)] p-6 pt-5">
            <div className="flex flex-wrap gap-2">
        {statusActions.map((action) => (
          <button
            key={action.value}
            type="button"
            disabled={updatingApplicationId === application.id || application.application_status === action.value}
            onClick={() => onUpdateStatus(application.id, action.value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              application.application_status === action.value
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white/70 hover:bg-white",
            )}
          >
            {updatingApplicationId === application.id && application.application_status !== action.value ? "Updating..." : action.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <MetricCard label="Fit" value={`${application.fit_score ?? 0}%`} />
        <MetricCard label="Alignment" value={`${breakdown?.roleAlignment ?? 0}%`} />
        <MetricCard label="ATS coverage" value={`${breakdown?.atsKeywordCoverage ?? 0}%`} />
        <MetricCard label="Readiness" value={`${breakdown?.overallReadiness ?? 0}%`} />
        <MetricCard label="Priority" value={priorityLabel(insights?.improvementPriority)} />
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <DetailedMatchBreakdown breakdown={breakdown} />
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Strengths" items={application.strengths} />
            <ListCard title="What lowers the score" items={application.gaps} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Matching skills" items={insights?.matchingSkills ?? []} />
            <ListCard title="Missing critical skills" items={insights?.missingCriticalSkills ?? []} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Experience highlights" items={insights?.experienceHighlights ?? []} />
            <ListCard title="Education highlights" items={insights?.educationHighlights ?? []} />
          </div>
        </div>

        <div className="space-y-5">
          <RecommendationCard
            title="Hiring recommendation"
            body={insights?.hiringRecommendation || "A recommendation will appear once analysis is complete."}
            accent="olive"
          />
          <RecommendationCard
            title="Candidate summary"
            body={insights?.candidateSummary || application.fit_summary || "Candidate summary pending."}
            accent="accent"
          />
          <ListCard title="Recommended interview questions" items={insights?.recommendedQuestions ?? []} />
          <ResumeSnapshotCard structuredResume={parsedResume} />
        </div>
          </div>
        </div>
        </div>
      </div>
    </article>
  );
}

function ApplicantDiscover({
  jobs,
  appliedJobIds,
  onApply,
  onViewDetails,
}: {
  jobs: JobRow[];
  appliedJobIds: string[];
  onApply: (jobId: string) => void;
  onViewDetails: (jobId: string) => void;
}) {
  return (
    <div className="grid gap-5 grid-cols-1">
      {jobs.length ? (
        jobs.map((job) => {
          const hasApplied = appliedJobIds.includes(job.id);

          return (
            <article key={job.id} className="glass-card flex flex-col gap-6 items-start rounded-[28px] p-6 sm:p-8">
              <div className="w-full">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{job.job_title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {job.company_name} · {job.location} · {job.workplace_type} · {job.employment_type}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-[var(--card-strong)] px-3 py-1 text-sm font-semibold whitespace-nowrap">
                    {job.application_count ?? 0} applicants
                  </div>
                </div>

                <div className="mt-4 text-sm font-semibold text-[var(--olive)]">
                  {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                </div>

                <p className="mt-6 line-clamp-3 text-sm leading-7 text-[var(--muted)]">{job.description}</p>

                <div className="mt-6 border-t border-[var(--line)] pt-6 flex flex-wrap items-center gap-3">
                  {hasApplied ? (
                    <span className="rounded-full bg-[rgba(95,111,82,0.1)] px-5 py-3 font-semibold text-[var(--olive)]">
                      You have already applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApply(job.id)}
                      className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
                    >
                      Apply with resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onViewDetails(job.id)}
                    className="rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm font-semibold transition hover:bg-white"
                  >
                    View job details
                  </button>
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState title="No jobs posted yet" text="Once recruiters publish roles, they will appear here for you to apply." />
      )}
    </div>
  );
}

function ApplicantApplications({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5">
      {data.applicantApplications.length ? (
        data.applicantApplications.map((application) => (
          <ApplicationReport key={application.id} application={application} />
        ))
      ) : (
        <EmptyState title="No applications yet" text="Pick a role from Discover, upload your resume, and your long role-fit report will appear here." />
      )}
    </div>
  );
}

function ApplicationReport({ application }: { application: ApplicationRow }) {
  const breakdown = application.match_breakdown;
  const insights = application.application_insights;
  const isAnalyzed = application.analysis_status === "completed";

  return (
    <article className="glass-card rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{application.job_title}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">{application.company_name}</div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            {isAnalyzed
              ? insights?.candidateSummary || application.fit_summary
              : "We are currently analyzing your submitted resume against this role. Your fit details, missing keywords, and actionable feedback will appear here shortly as soon as analysis completes."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={application.application_status} />
          {isAnalyzed ? <ScorePill value={application.fit_score ?? 0} /> : null}
        </div>
      </div>

      <div className="mt-6">
        <StatusTimeline status={application.application_status} />
      </div>

      {isAnalyzed ? (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <ListCard title="Why you match this role" items={application.strengths} />
            <ListCard title="Missing keywords & gaps" items={insights?.missingCriticalSkills?.length ? insights.missingCriticalSkills : application.gaps} />
          </div>

          <div className="space-y-4">
            <RecommendationCard
              title="Improvement focus"
              body={breakdown?.improvementSuggestions?.[0] || "Review your resume for missing keywords to increase your chances."}
              accent="accent"
            />
            <ListCard title="Actionable next steps" items={breakdown?.improvementSuggestions ?? []} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DetailedMatchBreakdown({ breakdown, applicantMode = false }: { breakdown?: MatchBreakdown | null; applicantMode?: boolean }) {
  if (!breakdown) {
    return (
      <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
        <div className="text-sm font-semibold text-[var(--ink)]">Detailed match breakdown</div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Analysis is still running. Category scores and deeper fit signals will appear here once processing completes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm font-semibold text-[var(--ink)]">Detailed match breakdown</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MatchMeter label="Skill match" value={breakdown.skillMatch} />
        <MatchMeter label="Experience match" value={breakdown.experienceMatch} />
        <MatchMeter label="Education match" value={breakdown.educationMatch} />
        <MatchMeter label="Keyword overlap" value={breakdown.keywordOverlap} />
        <MatchMeter label="Responsibilities" value={breakdown.responsibilityMatch} />
        <MatchMeter label="Seniority" value={breakdown.seniorityMatch} />
        <MatchMeter label="Role alignment" value={breakdown.roleAlignment} />
        <MatchMeter label="Readiness" value={breakdown.overallReadiness} />
        <MatchMeter label="ATS coverage" value={breakdown.atsKeywordCoverage} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListCard title="Top matching areas" items={breakdown.topMatches} compact />
        <ListCard title={applicantMode ? "How to improve fit" : "Top gaps"} items={applicantMode ? breakdown.improvementSuggestions : breakdown.topGaps} compact />
      </div>
    </div>
  );
}

function ResumeSnapshotCard({ structuredResume }: { structuredResume?: Record<string, unknown> | null }) {
  const skills = pullStringArray(structuredResume?.skills);
  const experience = pullStringArray(structuredResume?.experience);
  const education = pullStringArray(structuredResume?.education);
  const keywords = pullStringArray(structuredResume?.keywords);

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm font-semibold text-[var(--ink)]">Parsed resume snapshot</div>
      <div className="mt-4 space-y-4 text-sm text-[var(--muted)]">
        <div>
          <div className="font-semibold text-[var(--ink)]">Skills</div>
          <p className="mt-2">{skills.length ? skills.slice(0, 8).join(", ") : "No structured skills captured yet."}</p>
        </div>
        <div>
          <div className="font-semibold text-[var(--ink)]">Experience</div>
          <ul className="mt-2 space-y-2">
            {experience.length ? experience.slice(0, 3).map((item) => <li key={item}>- {item}</li>) : <li>- No experience lines captured yet.</li>}
          </ul>
        </div>
        <div>
          <div className="font-semibold text-[var(--ink)]">Education</div>
          <ul className="mt-2 space-y-2">
            {education.length ? education.slice(0, 3).map((item) => <li key={item}>- {item}</li>) : <li>- No education lines captured yet.</li>}
          </ul>
        </div>
        <div>
          <div className="font-semibold text-[var(--ink)]">Keywords</div>
          <p className="mt-2">{keywords.length ? keywords.slice(0, 10).join(", ") : "No keywords captured yet."}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ title, body, accent }: { title: string; body: string; accent: "olive" | "accent" }) {
  return (
    <div className={cn("rounded-[22px] border p-4", accent === "olive" ? "border-[rgba(95,111,82,0.22)] bg-[rgba(95,111,82,0.08)]" : "border-[rgba(232,140,85,0.24)] bg-[rgba(232,140,85,0.09)]")}>
      <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function InsightBucketCard({ title, subtitle, items }: { title: string; subtitle: string; items: Array<{ label: string; count: number }> }) {
  return (
    <div className="glass-card rounded-[30px] p-6 sm:p-7">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-white/72 px-4 py-3">
            <span className="text-sm font-medium text-[var(--ink)]">{item.label}</span>
            <span className="rounded-full bg-[var(--card-strong)] px-3 py-1 text-sm font-semibold">{item.count}</span>
          </div>
        )) : <p className="text-sm text-[var(--muted)]">No signals available yet.</p>}
      </div>
    </div>
  );
}

function StatusTimeline({ status }: { status: ApplicationStatus }) {
  const steps: ApplicationStatus[] = ["submitted", "under_review", "shortlisted", "interview", "hired"];
  const activeIndex = timelineIndex(status);

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm font-semibold text-[var(--ink)]">Application timeline</div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const complete = index <= activeIndex && status !== "rejected";
          const rejected = status === "rejected" && step === "shortlisted";

          return (
            <div key={step} className={cn("rounded-[18px] border px-4 py-3 text-sm", complete ? "border-[rgba(95,111,82,0.28)] bg-[rgba(95,111,82,0.1)]" : "border-[var(--line)] bg-white", rejected ? "border-[rgba(171,74,74,0.3)] bg-[rgba(171,74,74,0.08)]" : "")}>
              <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                <CircleDot size={14} />
                <span>{statusLabel(step)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {status === "rejected" ? <p className="mt-3 text-sm text-[rgb(171,74,74)]">This application is currently marked as rejected.</p> : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[9rem] rounded-[24px] border border-[var(--line)] bg-white/65 px-4 py-4">
      <p className="min-h-[2.25rem] text-[11px] font-semibold uppercase leading-snug tracking-wide text-[var(--muted)] sm:text-xs">
        {label}
      </p>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function MatchMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-[var(--card-strong)] p-3">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--ink)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-full rounded-full bg-[var(--olive)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  return <TonePill label={`${value}% fit`} icon={<Target size={14} />} />;
}

function TonePill({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(95,111,82,0.14)] px-3 py-1 text-sm font-semibold text-[var(--olive)]">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <div className={cn("rounded-full px-3 py-1 text-sm font-semibold", statusTone(status))}>{statusLabel(status)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function ListCard({ title, items, compact = false }: { title: string; items: string[]; compact?: boolean }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
      <ul className={cn("text-sm text-[var(--muted)]", compact ? "mt-2 space-y-2" : "mt-3 space-y-2")}>
        {items.length ? items.map((item) => <li key={item}>- {item}</li>) : <li>- No details yet</li>}
      </ul>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass-card rounded-[28px] p-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-xl text-[var(--muted)]">{text}</p>
    </div>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countStatuses(applications: ApplicationRow[]) {
  return applications.reduce(
    (counts, application) => {
      counts[application.application_status] += 1;
      return counts;
    },
    {
      submitted: 0,
      under_review: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0,
      hired: 0,
    } as Record<ApplicationStatus, number>,
  );
}

function countListItems(items: string[]) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    if (!item) return accumulator;
    accumulator[item] = (accumulator[item] ?? 0) + 1;
    return accumulator;
  }, {});
}

function topEntries(map: Record<string, number>, limit: number) {
  return Object.entries(map)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function countScoreBands(applications: ApplicationRow[]) {
  return applications.reduce<Record<ScoreBand, number>>(
    (counts, application) => {
      const band = application.application_insights?.scoreBand ?? scoreBandFor(application.fit_score ?? 0);
      counts[band] += 1;
      return counts;
    },
    { "0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 },
  );
}

function priorityLabel(priority?: ApplicationInsights["improvementPriority"]) {
  switch (priority) {
    case "low":
      return "Low";
    case "high":
      return "High";
    default:
      return "Medium";
  }
}

function statusLabel(status: ApplicationStatus) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "shortlisted":
      return "Shortlisted";
    case "interview":
      return "Interview";
    case "rejected":
      return "Rejected";
    case "hired":
      return "Hired";
  }
}

function statusTone(status: ApplicationStatus) {
  switch (status) {
    case "submitted":
      return "bg-[rgba(69,96,118,0.12)] text-[rgb(69,96,118)]";
    case "under_review":
      return "bg-[rgba(232,140,85,0.16)] text-[var(--accent)]";
    case "shortlisted":
      return "bg-[rgba(95,111,82,0.14)] text-[var(--olive)]";
    case "interview":
      return "bg-[rgba(73,111,163,0.14)] text-[rgb(73,111,163)]";
    case "rejected":
      return "bg-[rgba(171,74,74,0.14)] text-[rgb(171,74,74)]";
    case "hired":
      return "bg-[rgba(44,132,88,0.16)] text-[rgb(44,132,88)]";
  }
}

function scoreBandFor(score: number): ScoreBand {
  if (score <= 40) return "0-40";
  if (score <= 60) return "41-60";
  if (score <= 80) return "61-80";
  return "81-100";
}

function timelineIndex(status: ApplicationStatus) {
  switch (status) {
    case "submitted":
      return 0;
    case "under_review":
      return 1;
    case "shortlisted":
      return 2;
    case "interview":
      return 3;
    case "hired":
      return 4;
    case "rejected":
      return 1;
  }
}

function pullStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function deriveJobPreview(job: JobRow) {
  const text = `${job.description} ${job.requirements} ${job.responsibilities}`;
  const keywords = extractKeywords(text);
  const matchingAreas = keywords.slice(0, 3).map(capitalizeText);
  const missingAreas = keywords.slice(3, 6).map((keyword) => `Show evidence of ${keyword}`);
  const density = Math.min(100, 35 + keywords.length * 4);

  return {
    estimatedFit: Math.max(42, Math.min(88, density)),
    readinessLabel: density >= 75 ? "Strong" : density >= 55 ? "Moderate" : "Stretch",
    difficultyLabel: density >= 78 ? "High" : density >= 58 ? "Medium" : "Low",
    matchingAreas: matchingAreas.length ? matchingAreas : ["Core role signals become clearer after resume upload."],
    missingAreas: missingAreas.length ? missingAreas : ["Expect some role-specific keywords to matter here."],
  };
}

function extractKeywords(source: string) {
  const words = source
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !COMMON_WORDS.has(word));

  return Array.from(new Set(words)).slice(0, 12);
}

function capitalizeText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const COMMON_WORDS = new Set([
  "about",
  "after",
  "again",
  "their",
  "there",
  "would",
  "could",
  "should",
  "which",
  "while",
  "where",
  "years",
  "experience",
  "skills",
  "using",
  "build",
  "team",
  "teams",
  "role",
  "have",
  "with",
  "this",
  "that",
  "from",
  "into",
  "your",
  "will",
  "must",
  "across",
  "through",
]);

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
