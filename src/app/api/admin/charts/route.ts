import { NextResponse } from "next/server";
import { AdminUnauthorizedError, requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminChartsData } from "@/lib/db-admin";

export async function GET() {
  try {
    await requireAdminSessionApi();
    const charts = await getAdminChartsData();
    return NextResponse.json({ charts });
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return unauthorizedResponse();
    console.error("Admin charts failed:", error);
    return NextResponse.json({ error: "Failed to load charts" }, { status: 500 });
  }
}
