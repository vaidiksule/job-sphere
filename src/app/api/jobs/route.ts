import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createJob, getUserByEmail, listOpenJobs } from "@/lib/db";

const schema = z.object({
  companyName: z.string().min(2),
  jobTitle: z.string().min(2),
  location: z.string().min(2),
  workplaceType: z.string().min(2),
  employmentType: z.string().min(2),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().min(3),
  description: z.string().min(20),
  requirements: z.string().min(20),
  responsibilities: z.string().min(20),
});

export async function GET() {
  const jobs = await listOpenJobs();
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid job payload." }, { status: 400 });
  }

  const job = await createJob({
    recruiterId: user.id,
    ...parsed.data,
  });

  return NextResponse.json({ job });
}
