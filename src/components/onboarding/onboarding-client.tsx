"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Sparkles, UserRoundSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleCards = [
  {
    role: "recruiter" as const,
    title: "Recruiter dashboard",
    subtitle: "Post roles, review applicants, and manage your hiring pipeline.",
    icon: BriefcaseBusiness,
  },
  {
    role: "applicant" as const,
    title: "Applicant dashboard",
    subtitle: "Browse openings, upload your resume, and track your applications.",
    icon: UserRoundSearch,
  },
];

export function OnboardingClient({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>("recruiter");
  const [companyName, setCompanyName] = useState("");
  const [headline, setHeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => ((step + 1) / 3) * 100, [step]);

  async function completeOnboarding() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: selectedRole,
        companyName: selectedRole === "recruiter" ? companyName : "",
        headline,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Could not save onboarding.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid-bg min-h-screen px-4 py-8 sm:px-6">
      <div className="app-shell">
        <div className="glass-card overflow-hidden rounded-[32px]">
          <div className="border-b border-[var(--line)] px-6 py-4 sm:px-8">
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(95,111,82,0.12)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
              <span>Welcome, {name}</span>
              <span>{step + 1} / 3</span>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              {step === 0 ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Choose your lane</p>
                  <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
                    Which dashboard should open after Google sign-in?
                  </h1>
                  <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
                    Choose the workspace that fits how you want to use JobSphere.
                  </p>
                  <div className="mt-8 grid gap-4">
                    {roleCards.map((card) => {
                      const Icon = card.icon;
                      const active = selectedRole === card.role;
                      return (
                        <button
                          key={card.role}
                          type="button"
                          onClick={() => setSelectedRole(card.role)}
                          className={cn(
                            "flex items-start gap-4 rounded-[28px] border p-5 text-left transition hover:-translate-y-0.5",
                            active ? "border-[var(--olive)] bg-[rgba(95,111,82,0.12)]" : "border-[var(--line)] bg-white/60",
                          )}
                        >
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--card-strong)] text-[var(--olive)]">
                            <Icon size={22} />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">{card.title}</div>
                            <p className="mt-1 text-sm text-[var(--muted)]">{card.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Personalize</p>
                  <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
                    {selectedRole === "recruiter" ? "Set up your hiring identity" : "Set up your applicant profile"}
                  </h1>
                  <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
                    {selectedRole === "recruiter"
                      ? "Add the basics for your hiring workspace."
                      : "Add a short profile line so your applications feel complete."}
                  </p>
                  {selectedRole === "recruiter" ? (
                    <label className="mt-8 block">
                      <span className="mb-3 block text-sm font-semibold text-[var(--muted)]">Company name</span>
                      <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder="Example: Vivid Labs"
                        className="w-full rounded-[20px] border border-[var(--line)] bg-white/80 px-5 py-4 outline-none transition focus:border-[var(--olive)]"
                      />
                    </label>
                  ) : null}
                  <label className="mt-6 block">
                    <span className="mb-3 block text-sm font-semibold text-[var(--muted)]">
                      {selectedRole === "recruiter" ? "Hiring headline" : "Career headline"}
                    </span>
                    <textarea
                      value={headline}
                      onChange={(event) => setHeadline(event.target.value)}
                      placeholder={
                        selectedRole === "recruiter"
                          ? "Example: Hiring product, design, and growth talent for a fast-moving team."
                          : "Example: Product designer focused on UX systems, storytelling, and shipped interfaces."
                      }
                      className="min-h-32 w-full rounded-[20px] border border-[var(--line)] bg-white/80 px-5 py-4 outline-none transition focus:border-[var(--olive)]"
                    />
                  </label>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Ready</p>
                  <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
                    You&apos;re ready to enter JobSphere.
                  </h1>
                  <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
                    Your workspace is almost ready. Review your setup and continue.
                  </p>
                  <div className="mt-8 rounded-[28px] border border-[var(--line)] bg-white/70 p-5">
                    <div className="text-sm font-semibold text-[var(--muted)]">Selected dashboard</div>
                    <div className="mt-2 text-2xl font-semibold capitalize">{selectedRole}</div>
                    {companyName ? <div className="mt-4 text-sm text-[var(--muted)]">Company: {companyName}</div> : null}
                    {headline ? <div className="mt-2 text-sm text-[var(--muted)]">Headline: {headline}</div> : null}
                  </div>
                  {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
                </>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    className="rounded-full border border-[var(--line)] px-5 py-3 font-semibold text-[var(--ink)] transition hover:bg-white/70"
                  >
                    Back
                  </button>
                ) : null}
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current + 1)}
                    disabled={(step === 1 && selectedRole === "recruiter" && !companyName.trim()) || (step === 1 && !headline.trim())}
                    className="rounded-full bg-[var(--ink)] px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={completeOnboarding}
                    disabled={saving}
                    className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {saving ? "Saving your setup..." : "Open dashboard"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,248,236,0.94),rgba(245,235,221,0.82))] p-6 sm:p-8">
              <div className="flex items-center gap-3 text-[var(--olive)]">
                <Sparkles size={18} />
                <span className="font-mono text-xs uppercase tracking-[0.35em]">Flow preview</span>
              </div>
              <div className="mt-6 space-y-4">
                {["Choose dashboard", "Personalize setup", "Enter your workspace"].map((item, index) => (
                  <div
                    key={item}
                    className={cn(
                      "rounded-[24px] border p-4",
                      index === step ? "border-[var(--olive)] bg-white" : "border-[var(--line)] bg-white/50",
                    )}
                  >
                    <div className="text-sm text-[var(--muted)]">Step {index + 1}</div>
                    <div className="mt-1 text-lg font-semibold">{item}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-[24px] bg-[var(--ink)] p-5 text-white">
                <div className="font-mono text-xs uppercase tracking-[0.35em] text-white/65">Workspace preview</div>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  A quick setup gets you into the right workspace without extra steps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
