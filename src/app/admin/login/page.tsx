import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="grid-bg flex min-h-screen items-center justify-center px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
