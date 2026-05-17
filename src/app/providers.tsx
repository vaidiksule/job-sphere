"use client";

/** App shell only — auth is server-side via `auth()`; no client session polling. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
