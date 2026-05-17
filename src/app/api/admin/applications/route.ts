import { NextResponse } from "next/server";
import { AdminUnauthorizedError, requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminApplicationsList } from "@/lib/db-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminSessionApi();
    const applications = await getAdminApplicationsList();
    return NextResponse.json({ applications });
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
