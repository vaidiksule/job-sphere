import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function requireDevOrAdmin() {
  if (process.env.NODE_ENV === "development") return true;
  const session = await getAdminSession();
  if (session) return true;
  return false;
}

export function devOrAdminDenied() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
