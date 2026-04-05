"use client";

import { signIn } from "next-auth/react";

export function GoogleSignIn({ label = "Continue with Google" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="inline-flex items-center justify-center gap-3 rounded-full border border-[var(--line)] bg-white/90 px-6 py-3 font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-white"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-sm text-white">G</span>
      {label}
    </button>
  );
}
