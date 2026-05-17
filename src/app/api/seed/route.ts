import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { devOrAdminDenied, requireDevOrAdmin } from '@/lib/dev-guard';

const FAKE_PROFILES = [
  { name: 'Alice Walker', background: 'Lead Full Stack Developer. 10 years experience. Expert in React, Node.js, and TypeScript. Extensive work building AI-powered SaaS applications from 0 to 1. Built production RAG pipelines with Pinecone, OpenAI, and Gemini. Highly skilled in AWS deployments, DevOps, and team leadership. Looking for a founding engineer role.' },
  { name: 'John Carmack', background: 'Principal Software Engineer. 15+ years experience. Expert in full-stack web and backend systems. Proficient in Next.js, Postgres, and Docker. Strong background in integrating ML models into scalable APIs. Led development of multiple successful B2B SaaS platforms handling millions of requests.' },
  { name: 'Linus Torvalds', background: 'Staff Web Developer. Focused on AI/ML applications and robust software architecture. 8 years building scalable robust enterprise software in Node and React. Deep understanding of vector databases, prompt engineering, and modern cloud architectures (Vercel, AWS).' },
];

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();
  try {
    const jobs = await sql`SELECT id FROM jobs LIMIT 1`;
    if (!jobs.length) return NextResponse.json({ error: "No jobs found" });
    const jobId = jobs[0].id;

    let addedCount = 0;
    for (const [i, profile] of FAKE_PROFILES.entries()) {
      const email = `perfectmatch${i}${Date.now()}@example.com`;
      
      const users = await sql`
        INSERT INTO app_users (email, full_name, role, onboarding_complete) 
        VALUES (${email}, ${profile.name}, 'applicant', true)
        RETURNING id
      `;
      const applicantId = users[0].id;

      await sql`
        INSERT INTO applications (job_id, applicant_id, resume_file_name, resume_text, application_status, analysis_status)
        VALUES (${jobId}, ${applicantId}, 'resume.pdf', ${profile.background}, 'submitted', 'pending')
      `;
      addedCount++;
    }

    return NextResponse.json({ success: true, count: addedCount, message: "Seeded best-fit applications" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
