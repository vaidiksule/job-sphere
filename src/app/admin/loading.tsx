export default function AdminLoading() {
  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass-card rounded-[28px] px-8 py-6 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--olive)]">JobSphere Admin</div>
        <p className="mt-3 text-sm text-[var(--muted)]">Loading dashboard…</p>
      </div>
    </div>
  );
}
