import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  const data = await getDashboardData(session.user.email);

  if (!data) {
    redirect("/onboarding");
  }

  return <DashboardShell data={data} />;
}
