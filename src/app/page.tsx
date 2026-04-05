import Link from "next/link";
import { auth } from "@/lib/auth";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

export default async function Home() {
  const session = await auth();
  const featureCards = [
    {
      eyebrow: "Recruiting pulse",
      title: "See the strongest applicants faster",
      description:
        "Quick role snapshots, clearer application status, and less back-and-forth when teams need to decide.",
    },
    {
      eyebrow: "Applicant clarity",
      title: "Keep the candidate journey simple",
      description:
        "One place to discover roles, upload resumes, and keep track of every application without confusion.",
    },
    {
      eyebrow: "Shared workspace",
      title: "Bring both sides into one flow",
      description:
        "Recruiters and applicants move through the same product rhythm, so the experience feels connected end to end.",
    },
  ];

  const workflow = [
    "Create a role with the details your team actually needs.",
    "Collect applications in a structured, readable format.",
    "Review fit, context, and progress without losing momentum.",
    "Give applicants a clearer path from discovery to submission.",
  ];

  const metrics = [
    ["Open roles", "24"],
    ["Active teams", "8"],
    ["Weekly applicants", "320+"],
    ["Tracked stages", "6"],
  ];

  const audience = [
    {
      title: "For recruiters",
      points: [
        "Post roles and keep incoming applications organized.",
        "Review candidates with useful summaries at a glance.",
        "Reduce manual follow-up across scattered tools.",
      ],
    },
    {
      title: "For applicants",
      points: [
        "Browse roles with cleaner context before applying.",
        "Submit resumes in a flow that feels lightweight.",
        "Track progress without guessing what happens next.",
      ],
    },
  ];

  return (
    <main className="grid-bg min-h-screen px-4 py-6 sm:px-6">
      <div className="app-shell">
        <div className="space-y-6 pb-10">
          <section className="glass-card overflow-hidden rounded-[36px] border border-[var(--line)]">
            <div className="border-b border-[var(--line)] px-6 py-4 text-center sm:px-8">
              <span className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--olive)]">JobSphere</span>
            </div>
            <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--muted)]">
                  Hiring, organized
                </div>
                <p className="mt-8 text-base text-[var(--muted)]">Built for hiring teams and applicants.</p>
                <p className="mt-3 max-w-xl text-base text-[var(--muted)]">
                  Tired of manually reading resumes, chasing applications, and switching between recruiter and applicant experiences that feel disconnected?
                </p>
                <h1 className="mt-6 max-w-3xl font-[var(--font-heading)] text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                  Bring your hiring flow into one place with <span className="text-[var(--accent)]">JobSphere</span>.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
                  Post roles, review applications, and keep both recruiter and applicant journeys simple from start to finish.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {session?.user ? (
                    <Link href="/dashboard" className="rounded-full bg-[var(--ink)] px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5">
                      Open dashboard
                    </Link>
                  ) : (
                    <GoogleSignIn label="Start with Google" />
                  )}
                  <Link href="/login" className="rounded-full border border-[var(--line)] px-6 py-3 font-semibold hover:bg-white/70">
                    See the flow
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-[30px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,248,236,1),rgba(244,232,213,0.95))] p-5 shadow-[0_20px_70px_rgba(46,39,25,0.12)]">
                  <div className="rounded-[24px] border border-[var(--line)] bg-white/90 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Recruiter</div>
                        <div className="mt-2 text-2xl font-semibold">Product Designer</div>
                      </div>
                      <div className="rounded-full bg-[rgba(95,111,82,0.14)] px-3 py-1 text-sm font-semibold text-[var(--olive)]">12 apps</div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        ["Avg fit", "81%"],
                        ["Salary", "$90k-$120k"],
                        ["Mode", "Hybrid"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[18px] bg-[var(--card-strong)] p-3">
                          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</div>
                          <div className="mt-2 text-lg font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--ink)] p-5 text-white">
                    <div className="font-mono text-xs uppercase tracking-[0.35em] text-white/60">Applicant</div>
                    <div className="mt-3 text-2xl font-semibold">Application submitted</div>
                    <p className="mt-3 text-sm leading-7 text-white/75">
                      Applicants can discover open roles, upload resumes, and keep track of applications in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="glass-card rounded-[32px] px-6 py-8 sm:px-8">
              <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Why it works</div>
              <h2 className="mt-4 max-w-xl font-[var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
                A calmer hiring workflow for both sides of the process.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)]">
                JobSphere keeps the experience warm and focused: enough structure to reduce chaos, without making recruiting or applying feel heavy.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {metrics.map(([label, value]) => (
                  <div key={label} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                    <div className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{label}</div>
                    <div className="mt-3 text-3xl font-semibold text-[var(--ink)]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {featureCards.map((card) => (
                <article key={card.title} className="glass-card rounded-[28px] px-6 py-6 sm:px-7">
                  <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">{card.eyebrow}</div>
                  <h3 className="mt-4 font-[var(--font-heading)] text-2xl font-semibold tracking-tight">{card.title}</h3>
                  <p className="mt-3 max-w-xl text-base leading-8 text-[var(--muted)]">{card.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[32px] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">From opening to outcome</div>
                <h2 className="mt-4 max-w-lg font-[var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
                  More than a hero screen. A full hiring journey in one product.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
                  The homepage now leads into the product story instead of stopping after the first fold, so people can scroll and understand the platform before signing in.
                </p>
              </div>
              <div className="space-y-4">
                {workflow.map((item, index) => (
                  <div key={item} className="rounded-[26px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(250,244,236,0.9))] p-5">
                    <div className="text-sm font-semibold text-[var(--accent)]">0{index + 1}</div>
                    <p className="mt-2 text-lg leading-8 text-[var(--ink)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {audience.map((group) => (
              <article key={group.title} className="glass-card rounded-[32px] px-6 py-8 sm:px-8">
                <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">{group.title}</div>
                <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-semibold tracking-tight">
                  {group.title === "For recruiters" ? "Stay in control of hiring momentum." : "Apply with less friction and more clarity."}
                </h2>
                <div className="mt-6 space-y-3">
                  {group.points.map((point) => (
                    <div key={point} className="rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4 text-base leading-7 text-[var(--muted)]">
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="glass-card rounded-[36px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,248,236,0.9),rgba(245,235,221,0.92))] px-6 py-10 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Ready to move</div>
                <h2 className="mt-4 max-w-2xl font-[var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-5xl">
                  Let the homepage invite people in, then give them room to keep exploring.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)]">
                  Scrollable, clearer, and still consistent with the theme you already started.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {session?.user ? (
                  <Link href="/dashboard" className="rounded-full bg-[var(--ink)] px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5">
                    Go to dashboard
                  </Link>
                ) : (
                  <GoogleSignIn label="Continue with Google" />
                )}
                <Link href="/login" className="rounded-full border border-[var(--line)] px-6 py-3 font-semibold hover:bg-white/70">
                  Open sign in
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
