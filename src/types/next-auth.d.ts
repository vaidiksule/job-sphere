import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "recruiter" | "applicant";
      onboardingComplete?: boolean;
      companyName?: string;
      headline?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
    role?: "recruiter" | "applicant";
    onboardingComplete?: boolean;
    companyName?: string | null;
    headline?: string | null;
  }
}
