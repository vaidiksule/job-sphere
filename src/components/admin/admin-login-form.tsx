"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(typeof payload.error === "string" ? payload.error : "Invalid credentials");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card mx-auto w-full max-w-md rounded-[32px] p-8">
      <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere Admin</div>
      <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Platform monitoring and reports</p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[var(--ink)]">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="field-input mt-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--ink)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="field-input mt-2"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-[var(--ink)] px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
