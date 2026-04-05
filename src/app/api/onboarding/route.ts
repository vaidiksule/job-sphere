import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { updateUserOnboarding } from "@/lib/db";

const schema = z.object({
  role: z.enum(["recruiter", "applicant"]),
  companyName: z.string().optional(),
  headline: z.string().min(2),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const user = await updateUserOnboarding({
    email: session.user.email,
    role: parsed.data.role,
    companyName: parsed.data.companyName,
    headline: parsed.data.headline,
  });

  return NextResponse.json({ user });
}
