import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignIn } from "@/components/auth/google-sign-in";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid-bg min-h-screen px-4 py-8 sm:px-6">
      <div className="app-shell">
        <div className="glass-card grid overflow-hidden rounded-[34px] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border-b border-[var(--line)] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r">
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere</div>
            <h1 className="mt-5 font-[var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Sign in to continue.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
              Access your workspace and pick up where you left off.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GoogleSignIn />
              <Link href="/" className="rounded-full border border-[var(--line)] px-5 py-3 font-semibold hover:bg-white/70">
                Back home
              </Link>
            </div>
          </section>
          <section className="bg-[linear-gradient(180deg,rgba(255,248,236,0.82),rgba(245,235,221,0.95))] px-6 py-8 sm:px-8">
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">Get started</div>
            <div className="mt-6 space-y-4">
              {[
                "Sign in with Google.",
                "Choose your workspace.",
                "Start posting roles or applying to them.",
              ].map((item, index) => (
                <div key={item} className="rounded-[24px] border border-[var(--line)] bg-white/75 p-4">
                  <div className="text-sm text-[var(--muted)]">Step {index + 1}</div>
                  <div className="mt-1 text-lg font-semibold">{item}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
