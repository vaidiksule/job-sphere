import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import { getUserByEmail, upsertUser } from "@/lib/db";

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
      if (!user.email) return false;
      await upsertUser({
        email: user.email,
        fullName: user.name ?? user.email.split("@")[0],
        imageUrl: user.image,
      });
      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      const appUser = await getUserByEmail(token.email);
      if (appUser) {
        token.appUserId = appUser.id;
        token.role = appUser.role;
        token.onboardingComplete = appUser.onboarding_complete;
        token.companyName = appUser.company_name;
        token.headline = appUser.headline;
        token.name = appUser.full_name;
        token.picture = appUser.image_url;
      }
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
