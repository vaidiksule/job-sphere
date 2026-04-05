import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserByEmail, updateApplicationStatus } from "@/lib/db";

const schema = z.object({
  status: z.enum(["submitted", "under_review", "shortlisted", "interview", "rejected", "hired"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserByEmail(session.user.email);
  if (!user || user.role !== "recruiter") {
    return NextResponse.json({ error: "Recruiter access required." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status payload." }, { status: 400 });
  }

  const { id } = await context.params;
  const application = await updateApplicationStatus({
    applicationId: id,
    recruiterId: user.id,
    status: parsed.data.status,
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json({ application });
}
