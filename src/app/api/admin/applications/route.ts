import { NextResponse } from "next/server";
import { AdminUnauthorizedError, requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/db-admin";

export async function GET() {
  try {
    await requireAdminSessionApi();
    const data = await getAdminDashboardData();
    return NextResponse.json({ applications: data.applications });
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
