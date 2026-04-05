import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (session.user.onboardingComplete) {
    redirect("/dashboard");
  }

  return <OnboardingClient name={session.user.name ?? "there"} />;
}
