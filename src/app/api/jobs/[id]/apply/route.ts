export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApplication, getJobById, getUserByEmail } from "@/lib/db";
import { extractResumeText, ResumeExtractionError } from "@/lib/resume";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user || user.role !== "applicant") {
      return NextResponse.json({ error: "Applicant access required." }, { status: 403 });
    }

    const { id } = await context.params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const resumeText = await extractResumeText(file);
    if (!resumeText) {
      return NextResponse.json({ error: "Could not read resume content." }, { status: 400 });
    }

    let resumeUrl: string | undefined = undefined;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && anonKey) {
      const filePath = `${job.id}/${user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const response = await fetch(`${supabaseUrl}/storage/v1/object/resumes/${filePath}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
          "Content-Type": file.type || "application/pdf"
        },
        body: file 
      });

      if (response.ok) {
        resumeUrl = `${supabaseUrl}/storage/v1/object/public/resumes/${filePath}`;
      } else {
        console.error("Supabase Storage Upload failed:", await response.text());
      }
    }

    const application = await createApplication({
      jobId: job.id,
      applicantId: user.id,
      resumeFileName: file.name,
      resumeUrl,
      resumeText,
    });

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      console.warn("Resume extraction failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error while processing the resume.";
    console.error("Resume apply route failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
