import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminOverviewData } from "@/lib/db-admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const initial = await getAdminOverviewData();

  return <AdminShell initial={initial} username={session.username} />;
}
