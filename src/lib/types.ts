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
  resume_url?: string | null;
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

export type AdminOverview = {
  totalUsers: number;
  recruiters: number;
  applicants: number;
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  avgFitScore: number;
  pendingAnalyses: number;
  processedApplications: number;
  submitted: number;
  underReview: number;
  shortlisted: number;
  interview: number;
  rejected: number;
  hired: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
  companyName: string | null;
  headline: string | null;
  createdAt: string;
  jobsPosted: number;
  applicationsSubmitted: number;
  lastActiveAt: string | null;
};

export type AdminJobRow = {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  workplaceType: string;
  status: string;
  recruiterName: string;
  recruiterEmail: string;
  applicationCount: number;
  avgFitScore: number;
  createdAt: string;
};

export type AdminApplicationListRow = {
  id: string;
  jobId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  applicationStatus: ApplicationStatus;
  analysisStatus: string;
  fitScore: number | null;
  appliedAt: string;
  resumeFileName: string;
  fitSummary: string | null;
  strengths: string[];
  gaps: string[];
  matchBreakdown: MatchBreakdown | null;
  applicationInsights: ApplicationInsights | null;
};

export type AdminInsights = {
  hireRate: number;
  shortlistRate: number;
  interviewRate: number;
  analysisCompletionRate: number;
  avgApplicantsPerJob: number;
  avgApplicationsPerApplicant: number;
  highFitCandidates: number;
  jobsWithZeroApplicants: number;
};

export type AdminCharts = {
  usersByRole: Array<{ role: string; count: number }>;
  signupsByWeek: Array<{ week: string; count: number }>;
  applicationsByWeek: Array<{ week: string; count: number }>;
  statusBreakdown: Array<{ status: ApplicationStatus; count: number }>;
  scoreBands: Array<{ band: ScoreBand; count: number }>;
  topJobsByApplicants: Array<{ jobTitle: string; companyName: string; count: number }>;
  analysisStatus: Array<{ status: string; count: number }>;
  workplaceTypes: Array<{ type: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  avgFitByJob: Array<{ jobTitle: string; companyName: string; avgFit: number; applicants: number }>;
  hiringFunnel: Array<{ stage: string; count: number }>;
  applicationsPerJobBuckets: Array<{ bucket: string; jobCount: number }>;
  improvementPriority: Array<{ priority: ImprovementPriority; count: number }>;
  avgFitByWeek: Array<{ week: string; avgFit: number; applications: number }>;
  openVsClosedJobs: Array<{ status: string; count: number }>;
};

export type AdminActivityItem = {
  id: string;
  type: "signup" | "application";
  title: string;
  subtitle: string;
  at: string;
};

export type AdminDashboardData = {
  overview: AdminOverview;
  insights: AdminInsights;
  charts: AdminCharts;
  users: AdminUserRow[];
  jobs: AdminJobRow[];
  applications: AdminApplicationListRow[];
  activity: AdminActivityItem[];
};

export type AdminSession = {
  adminId: string;
  username: string;
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
