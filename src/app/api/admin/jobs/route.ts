import { NextResponse } from "next/server";
import { AdminUnauthorizedError, requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminJobsList } from "@/lib/db-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminSessionApi();
    const jobs = await getAdminJobsList();
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
