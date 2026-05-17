"use client";

import { useState } from "react";

export function ExportPdfButton() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      // Let Recharts measure layout before print (avoids empty/cropped charts in PDF).
      window.dispatchEvent(new Event("resize"));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
      window.print();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="no-print flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {exporting ? "Preparing PDF…" : "Export PDF"}
      </button>
      <p className="max-w-xs text-right text-xs text-[var(--muted)]">
        In the print dialog, turn off <strong>Headers and footers</strong> for a clean export.
      </p>
    </div>
  );
}
