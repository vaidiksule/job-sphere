import { NextResponse } from "next/server";
import { devOrAdminDenied, requireDevOrAdmin } from "@/lib/dev-guard";
import { resetAdminPassword } from "@/lib/db-admin";

/** Resets vaidikadmin password hash (fixes truncated/wrong hash in DB). Dev or admin session only. */
export async function POST() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();

  try {
    await resetAdminPassword("vaidikadmin", "vaidikadmin");
    return NextResponse.json({ ok: true, message: "vaidikadmin password reset to vaidikadmin" });
  } catch (error) {
    console.error("Admin bootstrap failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bootstrap failed" },
      { status: 500 },
    );
  }
}
