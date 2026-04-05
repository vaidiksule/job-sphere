export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeStructuredResumeFit, structureResumeWithGemini } from "@/lib/gemini";
import { getUserByEmail, listPendingApplicationsForRecruiter, updateApplicationAnalysis } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user || user.role !== "recruiter") {
      return NextResponse.json({ error: "Recruiter access required." }, { status: 403 });
    }

    const pending = await listPendingApplicationsForRecruiter(user.id);
    const processed: Array<{ id: string; score: number }> = [];

    for (const application of pending) {
      const structuredResume =
        application.structured_resume && typeof application.structured_resume === "object"
          ? (application.structured_resume as Record<string, unknown>)
          : await structureResumeWithGemini({
              resumeText: String(application.resume_text ?? ""),
              fileName: String(application.resume_file_name ?? "resume"),
            });

      const fit = await analyzeStructuredResumeFit({
        jobTitle: String(application.job_title ?? ""),
        companyName: String(application.company_name ?? ""),
        description: String(application.description ?? ""),
        requirements: String(application.requirements ?? ""),
        responsibilities: String(application.responsibilities ?? ""),
        structuredResume,
      });

      await updateApplicationAnalysis({
        applicationId: String(application.id),
        structuredResume,
        fitScore: fit.fitScore,
        fitSummary: fit.summary,
        strengths: fit.strengths,
        gaps: fit.gaps,
        matchBreakdown: fit.matchBreakdown,
        applicationInsights: fit.applicationInsights,
      });

      processed.push({ id: String(application.id), score: fit.fitScore });
    }

    return NextResponse.json({ processedCount: processed.length, processed });
  } catch (error) {
    console.error("Recruiter-side application analysis failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not analyze pending applications." },
      { status: 500 },
    );
  }
}
