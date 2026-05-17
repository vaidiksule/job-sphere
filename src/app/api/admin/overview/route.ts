import { NextResponse } from "next/server";
import { AdminUnauthorizedError, requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/db-admin";

export async function GET() {
  try {
    await requireAdminSessionApi();
    const data = await getAdminDashboardData();
    return NextResponse.json({
      overview: data.overview,
      charts: data.charts,
      activity: data.activity,
    });
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return unauthorizedResponse();
    console.error("Admin overview failed:", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
