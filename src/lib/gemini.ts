import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ApplicationInsights, MatchBreakdown, ScoreBand } from "@/lib/types";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function extractResumeTextFromImage(input: {
  bytesBase64: string;
  mimeType: string;
  fileName?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for image resume uploads.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `Extract all resume text from this image and return plain text only.
Do not summarize.
Do not add markdown.
Preserve important fields like name, email, phone, skills, education, projects, and experience.
Filename: ${input.fileName ?? "resume-image"}`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.bytesBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  });

  return result.response.text().trim();
}

export async function structureResumeWithGemini(input: {
  resumeText: string;
  fileName?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return heuristicResumeStructure(input.resumeText);
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Convert this resume into compact JSON only.
Return valid JSON with this exact shape:
{
  "basics": {
    "summary": string,
    "email": string,
    "phone": string,
    "location": string
  },
  "skills": string[],
  "experience": string[],
  "education": string[],
  "projects": string[],
  "keywords": string[]
}

Rules:
- Use empty strings when data is missing.
- Keep arrays concise and recruiter-friendly.
- keywords should be the most relevant role-related terms from the resume.

Filename: ${input.fileName ?? "resume"}
Resume text: ${input.resumeText}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return heuristicResumeStructure(input.resumeText);
  }
}

export async function analyzeResumeFit(input: {
  jobTitle: string;
  companyName: string;
  description: string;
  requirements: string;
  responsibilities: string;
  resumeText: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return heuristicMatch(input);
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are reviewing a job application.
Return only valid JSON with this exact shape:
{
  "fitScore": number,
  "summary": string,
  "strengths": string[],
  "gaps": string[],
  "matchBreakdown": {
    "skillMatch": number,
    "experienceMatch": number,
    "educationMatch": number,
    "keywordOverlap": number,
    "responsibilityMatch": number,
    "seniorityMatch": number,
    "roleAlignment": number,
    "overallReadiness": number,
    "atsKeywordCoverage": number,
    "topMatches": string[],
    "topGaps": string[],
    "improvementSuggestions": string[]
  },
  "applicationInsights": {
    "candidateSummary": string,
    "missingCriticalSkills": string[],
    "matchingSkills": string[],
    "experienceHighlights": string[],
    "educationHighlights": string[],
    "recommendedQuestions": string[],
    "improvementPriority": "low" | "medium" | "high",
    "hiringRecommendation": string,
    "scoreBand": "0-40" | "41-60" | "61-80" | "81-100"
  }
}

Scoring rules:
- fitScore must be an integer between 0 and 100.
- summary must be 2 concise sentences.
- strengths and gaps must each contain 3 short bullet-ready items.
- each matchBreakdown score must be an integer between 0 and 100.
- topMatches, topGaps, and improvementSuggestions must each contain 3 short bullet-ready items.
- candidateSummary and hiringRecommendation should each be concise recruiter-friendly prose.
- applicationInsights arrays should each contain 3 short bullet-ready items.

Job title: ${input.jobTitle}
Company: ${input.companyName}
Description: ${input.description}
Requirements: ${input.requirements}
Responsibilities: ${input.responsibilities}
Resume: ${input.resumeText}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    return {
      fitScore: clampScore(parsed.fitScore),
      summary: String(parsed.summary ?? "Candidate reviewed against the role requirements."),
      strengths: toArray(parsed.strengths),
      gaps: toArray(parsed.gaps),
      matchBreakdown: normalizeBreakdown(parsed.matchBreakdown, parsed.strengths, parsed.gaps),
      applicationInsights: normalizeInsights(parsed.applicationInsights, parsed, parsed.strengths, parsed.gaps, clampScore(parsed.fitScore)),
    };
  } catch {
    return heuristicMatch(input);
  }
}

export async function analyzeStructuredResumeFit(input: {
  jobTitle: string;
  companyName: string;
  description: string;
  requirements: string;
  responsibilities: string;
  structuredResume: Record<string, unknown>;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return heuristicMatch({
      description: input.description,
      requirements: input.requirements,
      responsibilities: input.responsibilities,
      resumeText: JSON.stringify(input.structuredResume),
    });
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are reviewing a structured candidate profile against a job description.
Return only valid JSON with this exact shape:
{
  "fitScore": number,
  "summary": string,
  "strengths": string[],
  "gaps": string[],
  "matchBreakdown": {
    "skillMatch": number,
    "experienceMatch": number,
    "educationMatch": number,
    "keywordOverlap": number,
    "responsibilityMatch": number,
    "seniorityMatch": number,
    "roleAlignment": number,
    "overallReadiness": number,
    "atsKeywordCoverage": number,
    "topMatches": string[],
    "topGaps": string[],
    "improvementSuggestions": string[]
  },
  "applicationInsights": {
    "candidateSummary": string,
    "missingCriticalSkills": string[],
    "matchingSkills": string[],
    "experienceHighlights": string[],
    "educationHighlights": string[],
    "recommendedQuestions": string[],
    "improvementPriority": "low" | "medium" | "high",
    "hiringRecommendation": string,
    "scoreBand": "0-40" | "41-60" | "61-80" | "81-100"
  }
}

Scoring rules:
- fitScore must be an integer between 0 and 100.
- summary must be 2 concise sentences.
- strengths and gaps must each contain 3 short bullet-ready items.
- each matchBreakdown score must be an integer between 0 and 100.
- topMatches, topGaps, and improvementSuggestions must each contain 3 short bullet-ready items.
- candidateSummary and hiringRecommendation should each be concise recruiter-friendly prose.
- applicationInsights arrays should each contain 3 short bullet-ready items.

Job title: ${input.jobTitle}
Company: ${input.companyName}
Description: ${input.description}
Requirements: ${input.requirements}
Responsibilities: ${input.responsibilities}
Structured resume JSON: ${JSON.stringify(input.structuredResume)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    return {
      fitScore: clampScore(parsed.fitScore),
      summary: String(parsed.summary ?? "Candidate reviewed against the role requirements."),
      strengths: toArray(parsed.strengths),
      gaps: toArray(parsed.gaps),
      matchBreakdown: normalizeBreakdown(parsed.matchBreakdown, parsed.strengths, parsed.gaps),
      applicationInsights: normalizeInsights(parsed.applicationInsights, parsed, parsed.strengths, parsed.gaps, clampScore(parsed.fitScore)),
    };
  } catch {
    return heuristicMatch({
      description: input.description,
      requirements: input.requirements,
      responsibilities: input.responsibilities,
      resumeText: JSON.stringify(input.structuredResume),
    });
  }
}

function heuristicMatch(input: { description: string; requirements: string; responsibilities: string; resumeText: string; }): {
  fitScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  matchBreakdown: MatchBreakdown;
  applicationInsights: ApplicationInsights;
} {
  const jobWords = uniqueKeywords(`${input.description} ${input.requirements} ${input.responsibilities}`);
  const resumeWords = new Set(uniqueKeywords(input.resumeText));
  const matches = jobWords.filter((word) => resumeWords.has(word));
  const missing = jobWords.filter((word) => !resumeWords.has(word));
  const ratio = jobWords.length ? matches.length / jobWords.length : 0.45;
  const fitScore = clampScore(Math.round(45 + ratio * 50));
  const topMatches = matches.slice(0, 3).map(capitalizeWord);
  const topGaps = missing.slice(0, 3).map((word) => `Need clearer evidence of ${word}`);
  const fitSummary = fitScore >= 75
    ? "The resume aligns well with the core requirements and shows strong relevance for this role. A few role-specific details could still be clarified in screening."
    : "The resume shows partial overlap with the job requirements. The candidate may need stronger evidence around the listed tools, scope, or domain fit.";

  return {
    fitScore,
    summary: fitSummary,
    strengths: topMatches.concat(["Relevant experience is visible in the uploaded resume."]).slice(0, 3),
    gaps: topGaps,
    matchBreakdown: {
      skillMatch: fitScore,
      experienceMatch: clampScore(fitScore - 6),
      educationMatch: clampScore(fitScore - 10),
      keywordOverlap: clampScore(Math.round(ratio * 100)),
      responsibilityMatch: clampScore(fitScore - 4),
      seniorityMatch: clampScore(fitScore - 8),
      roleAlignment: clampScore(fitScore - 2),
      overallReadiness: clampScore(fitScore - 3),
      atsKeywordCoverage: clampScore(Math.round(ratio * 100)),
      topMatches,
      topGaps,
      improvementSuggestions: missing.slice(0, 3).map((word) => `Add a resume bullet showing measurable work with ${word}`),
    },
    applicationInsights: {
      candidateSummary: fitSummary,
      missingCriticalSkills: missing.slice(0, 3).map(capitalizeWord),
      matchingSkills: topMatches,
      experienceHighlights: [
        "Resume shows relevant experience examples tied to the target role.",
        "Work history appears aligned with core delivery expectations.",
        "Project evidence suggests practical hands-on exposure.",
      ].slice(0, 3),
      educationHighlights: [
        "Education details were identified from the uploaded resume.",
        "Academic background appears generally aligned with the role.",
        "Additional certifications or coursework could strengthen fit.",
      ].slice(0, 3),
      recommendedQuestions: topGaps.length
        ? topGaps.map((item) => `Ask the candidate to explain their real-world experience with ${item.replace(/^Need clearer evidence of /, "")}.`).slice(0, 3)
        : ["Ask for a walkthrough of a recent project relevant to this job.", "Ask how the candidate measures success in similar work.", "Ask which responsibilities in this role they can take on immediately."],
      improvementPriority: fitScore >= 80 ? "low" : fitScore >= 60 ? "medium" : "high",
      hiringRecommendation: fitScore >= 80
        ? "Strong shortlist candidate with clear alignment across the most important role signals."
        : fitScore >= 60
          ? "Worth screening further, but the recruiter should probe the missing areas before moving forward."
          : "Needs significant validation before advancing because several core role signals are weak or missing.",
      scoreBand: scoreBandFor(fitScore),
    },
  };
}

function uniqueKeywords(source: string) {
  return Array.from(new Set(
    source
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4 && !STOP_WORDS.has(word))
  ));
}

function toArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).slice(0, 3) : [];
}

function clampScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeBreakdown(value: unknown, strengthsValue: unknown, gapsValue: unknown): MatchBreakdown {
  const strengths = toArray(strengthsValue);
  const gaps = toArray(gapsValue);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      skillMatch: 0,
      experienceMatch: 0,
      educationMatch: 0,
      keywordOverlap: 0,
      responsibilityMatch: 0,
      seniorityMatch: 0,
      roleAlignment: 0,
      overallReadiness: 0,
      atsKeywordCoverage: 0,
      topMatches: strengths,
      topGaps: gaps,
      improvementSuggestions: gaps.map((item) => `Strengthen resume evidence for: ${item}`).slice(0, 3),
    };
  }

  const breakdown = value as Record<string, unknown>;

  return {
    skillMatch: clampScore(breakdown.skillMatch),
    experienceMatch: clampScore(breakdown.experienceMatch),
    educationMatch: clampScore(breakdown.educationMatch),
    keywordOverlap: clampScore(breakdown.keywordOverlap),
    responsibilityMatch: clampScore(breakdown.responsibilityMatch),
    seniorityMatch: clampScore(breakdown.seniorityMatch),
    roleAlignment: clampScore(breakdown.roleAlignment),
    overallReadiness: clampScore(breakdown.overallReadiness),
    atsKeywordCoverage: clampScore(breakdown.atsKeywordCoverage),
    topMatches: toArray(breakdown.topMatches).length ? toArray(breakdown.topMatches) : strengths,
    topGaps: toArray(breakdown.topGaps).length ? toArray(breakdown.topGaps) : gaps,
    improvementSuggestions: toArray(breakdown.improvementSuggestions).length
      ? toArray(breakdown.improvementSuggestions)
      : gaps.map((item) => `Strengthen resume evidence for: ${item}`).slice(0, 3),
  };
}

function normalizeInsights(
  value: unknown,
  parsed: Record<string, unknown>,
  strengthsValue: unknown,
  gapsValue: unknown,
  fitScore: number,
): ApplicationInsights {
  const strengths = toArray(strengthsValue);
  const gaps = toArray(gapsValue);
  const fallbackSummary = String(parsed.summary ?? "Candidate reviewed against the role requirements.");

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      candidateSummary: fallbackSummary,
      missingCriticalSkills: gaps,
      matchingSkills: strengths,
      experienceHighlights: strengths.length ? strengths : ["Relevant experience details need closer recruiter review."],
      educationHighlights: ["Education details are limited in the current analysis payload."],
      recommendedQuestions: gaps.length
        ? gaps.map((item) => `Ask the candidate to provide concrete evidence for ${item}.`).slice(0, 3)
        : ["Ask the candidate to walk through a relevant recent project."],
      improvementPriority: fitScore >= 80 ? "low" : fitScore >= 60 ? "medium" : "high",
      hiringRecommendation: fitScore >= 80
        ? "Strong shortlist candidate with clear alignment across the most important role signals."
        : fitScore >= 60
          ? "Worth screening further, but several areas should be validated."
          : "Needs significant validation before advancing.",
      scoreBand: scoreBandFor(fitScore),
    };
  }

  const insights = value as Record<string, unknown>;

  return {
    candidateSummary: String(insights.candidateSummary ?? fallbackSummary),
    missingCriticalSkills: toArray(insights.missingCriticalSkills).length ? toArray(insights.missingCriticalSkills) : gaps,
    matchingSkills: toArray(insights.matchingSkills).length ? toArray(insights.matchingSkills) : strengths,
    experienceHighlights: toArray(insights.experienceHighlights),
    educationHighlights: toArray(insights.educationHighlights),
    recommendedQuestions: toArray(insights.recommendedQuestions),
    improvementPriority: parseImprovementPriority(insights.improvementPriority, fitScore),
    hiringRecommendation: String(insights.hiringRecommendation ?? ""),
    scoreBand: parseScoreBand(insights.scoreBand, fitScore),
  };
}

function parseImprovementPriority(value: unknown, fitScore: number): ApplicationInsights["improvementPriority"] {
  switch (value) {
    case "low":
    case "medium":
    case "high":
      return value;
    default:
      return fitScore >= 80 ? "low" : fitScore >= 60 ? "medium" : "high";
  }
}

function parseScoreBand(value: unknown, fitScore: number): ScoreBand {
  switch (value) {
    case "0-40":
    case "41-60":
    case "61-80":
    case "81-100":
      return value;
    default:
      return scoreBandFor(fitScore);
  }
}

function scoreBandFor(score: number): ScoreBand {
  if (score <= 40) return "0-40";
  if (score <= 60) return "41-60";
  if (score <= 80) return "61-80";
  return "81-100";
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function heuristicResumeStructure(resumeText: string) {
  const lines = resumeText
    .split(/\n|\.\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const keywords = uniqueKeywords(resumeText).slice(0, 12);

  return {
    basics: {
      summary: lines.slice(0, 3).join(". ").slice(0, 300),
      email: extractMatch(resumeText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i),
      phone: extractMatch(resumeText, /(\+?\d[\d\s\-()]{7,}\d)/),
      location: "",
    },
    skills: keywords.slice(0, 8).map(capitalizeWord),
    experience: lines.slice(0, 5),
    education: lines.filter((line) => /university|college|bachelor|master|degree/i.test(line)).slice(0, 3),
    projects: lines.filter((line) => /project|built|developed|designed|launched/i.test(line)).slice(0, 4),
    keywords,
  };
}

function extractMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[0] ?? "";
}

const STOP_WORDS = new Set(["about", "after", "again", "their", "there", "would", "could", "should", "which", "while", "where", "years", "experience", "skills", "using", "build", "team", "teams", "role", "have", "with", "this", "that", "from", "into", "your", "will", "must", "across", "through"]);
