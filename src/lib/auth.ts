import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import { getUserByEmail, upsertUser } from "@/lib/db";
import type { UserRole } from "@/lib/types";

type AppUserRow = {
  id: string;
  email: string;
  full_name: string;
  image_url: string | null;
  role: string | null;
  onboarding_complete: boolean;
  company_name: string | null;
  headline: string | null;
};

function applyAppUserToToken(token: JWT, appUser: AppUserRow) {
  token.appUserId = appUser.id;
  token.role = (appUser.role as UserRole | null) ?? undefined;
  token.onboardingComplete = appUser.onboarding_complete;
  token.companyName = appUser.company_name;
  token.headline = appUser.headline;
  token.name = appUser.full_name;
  token.picture = appUser.image_url;
  return token;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async jwt({ token, user, account, trigger }) {
      if (!token.email) return token;

      if (user && account) {
        const appUser = (await upsertUser({
          email: user.email!,
          fullName: user.name ?? user.email!.split("@")[0],
          imageUrl: user.image ?? null,
        })) as AppUserRow;
        return applyAppUserToToken(token, appUser);
      }

      if (token.appUserId && trigger !== "update") return token;

      const appUser = (await getUserByEmail(token.email)) as AppUserRow | null;
      if (appUser) return applyAppUserToToken(token, appUser);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.appUserId ?? "");
        session.user.role = (token.role as "recruiter" | "applicant" | undefined) ?? undefined;
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.companyName = (token.companyName as string | undefined) ?? undefined;
        session.user.headline = (token.headline as string | undefined) ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export function auth() {
  return getServerSession(authOptions);
}
