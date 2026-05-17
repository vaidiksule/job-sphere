"use client";

export function ExportPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
    >
      Export PDF
    </button>
  );
}
