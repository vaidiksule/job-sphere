import { AdminReportView } from "@/components/admin/admin-report-view";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/db-admin";
import "./print.css";

export default async function AdminReportPage() {
  await requireAdminSession();
  const data = await getAdminDashboardData();
  const generatedAt = new Date().toLocaleString();

  return <AdminReportView data={data} generatedAt={generatedAt} />;
}
