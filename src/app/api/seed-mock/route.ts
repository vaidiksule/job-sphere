import { NextResponse } from "next/server";
import { devOrAdminDenied, requireDevOrAdmin } from "@/lib/dev-guard";
import { seedMockPlatformData } from "@/lib/seed-mock-data";

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();

  try {
    const result = await seedMockPlatformData();
    return NextResponse.json({
      success: true,
      message: "Mock recruiters, jobs, applicants, and completed analysis data seeded (no Gemini calls).",
      ...result,
    });
  } catch (error) {
    console.error("Mock seed failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mock seed failed" },
      { status: 500 },
    );
  }
}
