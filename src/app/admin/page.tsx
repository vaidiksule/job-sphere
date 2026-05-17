import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/db-admin";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData();

  return <AdminShell data={data} username={session.username} />;
}
