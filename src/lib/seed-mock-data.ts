import { ensureDatabase, sql } from "@/lib/db";
import type { ApplicationInsights, ApplicationStatus, MatchBreakdown, ScoreBand } from "@/lib/types";

const RECRUITER_COMPANIES = [
  "Northline Labs",
  "BrightHire Systems",
  "Atlas Talent Co",
  "Summit Recruit",
  "NovaStaff",
  "ClearPath HR",
  "Vertex Hiring",
  "BluePeak Ventures",
  "Orbit Workforce",
  "PrimeSlate",
  "Cedar Grove Tech",
  "Lumen Careers",
  "Forge Talent",
  "Skybridge HR",
  "Riverstone Partners",
  "Pulse Recruiting",
  "Ironclad Staffing",
  "OpenField Labs",
  "Nimbus People",
  "Coreline Talent",
];

const JOB_TITLES = [
  "Senior Full Stack Engineer",
  "Product Designer",
  "Data Analyst",
  "DevOps Engineer",
  "Frontend Developer",
  "Backend Engineer",
  "ML Engineer",
  "QA Automation Lead",
  "Technical Project Manager",
  "Customer Success Manager",
  "Sales Development Rep",
  "Marketing Operations Specialist",
  "HR Business Partner",
  "Finance Analyst",
  "Mobile Developer",
];

const LOCATIONS = ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "London, UK", "Toronto, ON"];
const WORKPLACE_TYPES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract"];

const FIRST_NAMES = [
  "Aisha", "Ben", "Carlos", "Diana", "Ethan", "Fatima", "Grace", "Hassan", "Ivy", "James",
  "Keira", "Leo", "Maya", "Noah", "Olivia", "Priya", "Quinn", "Ravi", "Sofia", "Tariq",
  "Uma", "Victor", "Wendy", "Xavier", "Yara", "Zoe", "Arjun", "Bella", "Chen", "Diego",
  "Elena", "Finn", "Gita", "Hugo", "Isla", "Jonah", "Kira", "Liam", "Mira", "Nina",
];

const LAST_NAMES = [
  "Patel", "Nguyen", "Garcia", "Kim", "Singh", "Brown", "Martinez", "Lee", "Wilson", "Khan",
  "Anderson", "Thomas", "Jackson", "White", "Harris", "Clark", "Lewis", "Walker", "Hall", "Young",
];

const SKILLS_POOL = [
  "React", "TypeScript", "Node.js", "Python", "SQL", "AWS", "Docker", "Figma", "Product strategy",
  "Data visualization", "Machine learning", "Communication", "Agile", "Kubernetes", "PostgreSQL",
];

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "interview",
  "rejected",
  "hired",
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickN<T>(items: T[], count: number) {
  const copy = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }
  return result;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);
  return date;
}

function scoreBandFromFit(fitScore: number): ScoreBand {
  if (fitScore <= 40) return "0-40";
  if (fitScore <= 60) return "41-60";
  if (fitScore <= 80) return "61-80";
  return "81-100";
}

function buildMatchBreakdown(fitScore: number): MatchBreakdown {
  const jitter = () => Math.max(20, Math.min(98, fitScore + randomInt(-12, 12)));
  return {
    skillMatch: jitter(),
    experienceMatch: jitter(),
    educationMatch: jitter(),
    keywordOverlap: jitter(),
    responsibilityMatch: jitter(),
    seniorityMatch: jitter(),
    roleAlignment: jitter(),
    overallReadiness: jitter(),
    atsKeywordCoverage: jitter(),
    topMatches: pickN(SKILLS_POOL, 3),
    topGaps: pickN(SKILLS_POOL, 2),
    improvementSuggestions: [
      "Highlight measurable outcomes from recent projects.",
      "Add role-specific keywords from the job description.",
    ],
  };
}

function buildInsights(fitScore: number, name: string, jobTitle: string): ApplicationInsights {
  const band = scoreBandFromFit(fitScore);
  const priority = fitScore >= 75 ? "low" : fitScore >= 55 ? "medium" : "high";
  const recommendation =
    fitScore >= 80
      ? "Strong match — recommend moving to interview."
      : fitScore >= 60
        ? "Solid baseline fit — worth a structured screen."
        : fitScore >= 45
          ? "Mixed signals — validate core skills before advancing."
          : "Weak fit for this role — deprioritize unless pipeline is thin.";

  return {
    candidateSummary: `${name} brings relevant experience for ${jobTitle} with a ${fitScore}% estimated fit based on resume signals.`,
    missingCriticalSkills: pickN(SKILLS_POOL, 3),
    matchingSkills: pickN(SKILLS_POOL, 4),
    experienceHighlights: [
      "Led cross-functional delivery on a customer-facing platform.",
      "Owned roadmap items from discovery through release.",
    ],
    educationHighlights: ["B.Tech in Computer Science", "Relevant certifications in cloud and agile delivery"],
    recommendedQuestions: [
      "Walk through a recent project where you owned end-to-end delivery.",
      "How do you prioritize when requirements change mid-sprint?",
    ],
    improvementPriority: priority,
    hiringRecommendation: recommendation,
    scoreBand: band,
  };
}

function buildStructuredResume(name: string) {
  return {
    basics: { name, title: pick(JOB_TITLES) },
    skills: pickN(SKILLS_POOL, 8),
    experience: [
      `${pick(RECRUITER_COMPANIES)} — ${pick(JOB_TITLES)} (2 years)`,
      `${pick(RECRUITER_COMPANIES)} — Intern / Associate (1 year)`,
    ],
    education: ["Bachelor's degree, Computer Science"],
    keywords: pickN(SKILLS_POOL, 6),
  };
}

function buildResumeText(name: string, headline: string) {
  return `${name} — ${headline}. Experienced professional with hands-on delivery across modern web stacks, cross-functional collaboration, and measurable business outcomes.`;
}

export async function seedMockPlatformData() {
  await ensureDatabase();

  const recruiterCount = randomInt(10, 20);
  const runId = Date.now();
  const applicantPoolSize = randomInt(28, 38);

  const recruiterIds: string[] = [];
  const jobRows: Array<{ id: string; recruiterId: string; title: string; company: string }> = [];
  const applicantIds: Array<{ id: string; name: string; email: string; headline: string }> = [];

  let applicationsCreated = 0;
  let pendingAnalysisCount = 0;

  for (let i = 0; i < recruiterCount; i++) {
    const company = RECRUITER_COMPANIES[i % RECRUITER_COMPANIES.length];
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const email = `mock.recruiter.${i + 1}.${runId}@jobsphere.demo`;
    const createdAt = daysAgo(randomInt(14, 56));

    const [recruiter] = await sql`
      INSERT INTO app_users (email, full_name, role, onboarding_complete, company_name, headline, created_at, updated_at)
      VALUES (
        ${email},
        ${fullName},
        'recruiter',
        true,
        ${company},
        ${`Talent lead at ${company}`},
        ${createdAt},
        ${createdAt}
      )
      RETURNING id
    `;
    recruiterIds.push(String(recruiter.id));

    const jobsForRecruiter = randomInt(1, 2);
    for (let j = 0; j < jobsForRecruiter; j++) {
      const jobTitle = pick(JOB_TITLES);
      const location = pick(LOCATIONS);
      const status = Math.random() < 0.85 ? "open" : "closed";
      const jobCreatedAt = daysAgo(randomInt(3, 45));

      const [job] = await sql`
        INSERT INTO jobs (
          recruiter_id, company_name, job_title, location, workplace_type, employment_type,
          salary_min, salary_max, salary_currency, description, requirements, responsibilities, status, created_at, updated_at
        )
        VALUES (
          ${recruiter.id},
          ${company},
          ${jobTitle},
          ${location},
          ${pick(WORKPLACE_TYPES)},
          ${pick(EMPLOYMENT_TYPES)},
          ${randomInt(55, 95) * 1000},
          ${randomInt(100, 160) * 1000},
          'USD',
          ${`We are hiring a ${jobTitle} to help ${company} scale hiring operations and product delivery.`},
          ${`3+ years experience, strong communication, and proven ownership in ${jobTitle.toLowerCase()} work.`},
          ${`Own delivery, collaborate with stakeholders, and improve hiring workflows end to end.`},
          ${status},
          ${jobCreatedAt},
          ${jobCreatedAt}
        )
        RETURNING id
      `;

      jobRows.push({
        id: String(job.id),
        recruiterId: String(recruiter.id),
        title: jobTitle,
        company,
      });
    }
  }

  for (let i = 0; i < applicantPoolSize; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const email = `mock.applicant.${i + 1}.${runId}@jobsphere.demo`;
    const headline = pick(JOB_TITLES);
    const createdAt = daysAgo(randomInt(5, 50));

    const [applicant] = await sql`
      INSERT INTO app_users (email, full_name, role, onboarding_complete, headline, created_at, updated_at)
      VALUES (${email}, ${fullName}, 'applicant', true, ${headline}, ${createdAt}, ${createdAt})
      RETURNING id
    `;

    applicantIds.push({ id: String(applicant.id), name: fullName, email, headline });
  }

  for (const job of jobRows) {
    const applicantCount = randomInt(3, 14);
    const chosenApplicants = pickN(applicantIds, Math.min(applicantCount, applicantIds.length));

    for (const applicant of chosenApplicants) {
      const fitScore = randomInt(32, 96);
      const applicationStatus = pick(APPLICATION_STATUSES);
      const markPending = Math.random() < 0.08;
      const analysisStatus = markPending ? "pending" : "completed";
      if (markPending) pendingAnalysisCount++;

      const appliedAt = daysAgo(randomInt(1, 40));
      const breakdown = buildMatchBreakdown(fitScore);
      const insights = buildInsights(fitScore, applicant.name, job.title);
      const structuredResume = buildStructuredResume(applicant.name);
      const strengths = pickN(SKILLS_POOL, 4);
      const gaps = pickN(SKILLS_POOL, 3);

      await sql`
        INSERT INTO applications (
          job_id,
          applicant_id,
          resume_file_name,
          resume_text,
          structured_resume,
          analysis_status,
          application_status,
          fit_score,
          fit_summary,
          strengths,
          gaps,
          match_breakdown,
          application_insights,
          applied_at
        )
        VALUES (
          ${job.id},
          ${applicant.id},
          ${`${applicant.name.replace(/\s+/g, "_").toLowerCase()}_resume.pdf`},
          ${buildResumeText(applicant.name, applicant.headline)},
          ${sql.json(structuredResume)},
          ${analysisStatus},
          ${applicationStatus},
          ${markPending ? null : fitScore},
          ${markPending ? null : `${applicant.name} shows a ${fitScore}% fit for ${job.title} at ${job.company}.`},
          ${sql.json(strengths)},
          ${sql.json(gaps)},
          ${markPending ? null : sql.json(breakdown)},
          ${markPending ? null : sql.json(insights)},
          ${appliedAt}
        )
        ON CONFLICT (job_id, applicant_id) DO NOTHING
      `;

      applicationsCreated++;
    }
  }

  const overlapPasses = randomInt(8, 16);
  for (let i = 0; i < overlapPasses; i++) {
    const applicant = pick(applicantIds);
    const job = pick(jobRows);
    const fitScore = randomInt(40, 92);
    const applicationStatus = pick(APPLICATION_STATUSES);
    const appliedAt = daysAgo(randomInt(2, 35));
    const breakdown = buildMatchBreakdown(fitScore);
    const insights = buildInsights(fitScore, applicant.name, job.title);

    const inserted = await sql`
      INSERT INTO applications (
        job_id,
        applicant_id,
        resume_file_name,
        resume_text,
        structured_resume,
        analysis_status,
        application_status,
        fit_score,
        fit_summary,
        strengths,
        gaps,
        match_breakdown,
        application_insights,
        applied_at
      )
      VALUES (
        ${job.id},
        ${applicant.id},
        ${`${applicant.name.replace(/\s+/g, "_").toLowerCase()}_resume.pdf`},
        ${buildResumeText(applicant.name, applicant.headline)},
        ${sql.json(buildStructuredResume(applicant.name))},
        'completed',
        ${applicationStatus},
        ${fitScore},
        ${`${applicant.name} shows a ${fitScore}% fit for ${job.title} at ${job.company}.`},
        ${sql.json(pickN(SKILLS_POOL, 4))},
        ${sql.json(pickN(SKILLS_POOL, 3))},
        ${sql.json(breakdown)},
        ${sql.json(insights)},
        ${appliedAt}
      )
      ON CONFLICT (job_id, applicant_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length) applicationsCreated++;
  }

  return {
    recruiterCount,
    jobsCreated: jobRows.length,
    applicantsCreated: applicantIds.length,
    applicationsCreated,
    pendingAnalysisCount,
  };
}
