import { NextResponse } from "next/server";
import { requireAdminSessionApi, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminApplicationById } from "@/lib/db-admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSessionApi();
    const { id } = await context.params;
    const application = await getAdminApplicationById(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof Error && error.name === "AdminUnauthorizedError") {
      return unauthorizedResponse();
    }
    console.error("Admin application detail failed:", error);
    return NextResponse.json({ error: "Unable to load application." }, { status: 500 });
  }
}
