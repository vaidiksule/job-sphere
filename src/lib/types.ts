export type UserRole = "recruiter" | "applicant";

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "hired";

export type MatchBreakdown = {
  skillMatch: number;
  experienceMatch: number;
  educationMatch: number;
  keywordOverlap: number;
  responsibilityMatch: number;
  seniorityMatch: number;
  roleAlignment: number;
  overallReadiness: number;
  atsKeywordCoverage: number;
  topMatches: string[];
  topGaps: string[];
  improvementSuggestions: string[];
};

export type ImprovementPriority = "low" | "medium" | "high";

export type ScoreBand = "0-40" | "41-60" | "61-80" | "81-100";

export type ApplicationInsights = {
  candidateSummary: string;
  missingCriticalSkills: string[];
  matchingSkills: string[];
  experienceHighlights: string[];
  educationHighlights: string[];
  recommendedQuestions: string[];
  improvementPriority: ImprovementPriority;
  hiringRecommendation: string;
  scoreBand: ScoreBand;
};

export type JobRow = {
  id: string;
  recruiter_id: string;
  company_name: string;
  job_title: string;
  location: string;
  workplace_type: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  requirements: string;
  responsibilities: string;
  status: string;
  created_at: string;
  application_count?: number;
  avg_fit_score?: number | null;
};

export type ApplicationRow = {
  id: string;
  job_id: string;
  applicant_id: string;
  resume_file_name: string;
  resume_text: string;
  application_status: ApplicationStatus;
  fit_score: number | null;
  fit_summary: string | null;
  strengths: string[];
  gaps: string[];
  match_breakdown?: MatchBreakdown | null;
  application_insights?: ApplicationInsights | null;
  structured_resume?: Record<string, unknown> | null;
  analysis_status?: "pending" | "processing" | "completed" | "failed";
  applied_at: string;
  applicant_name: string;
  applicant_email: string;
  job_title?: string;
  company_name?: string;
};

export type DashboardData = {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    onboardingComplete: boolean;
    companyName?: string | null;
    headline?: string | null;
  };
  jobs: JobRow[];
  recruiterJobs: JobRow[];
  recruiterApplications: ApplicationRow[];
  applicantApplications: ApplicationRow[];
  metrics: {
    totalJobs: number;
    totalApplications: number;
    openRoles: number;
    avgFitScore: number;
  };
};
