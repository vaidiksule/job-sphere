import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  getAdminAccountByUsername,
  seedAdminAccountIfEmpty,
  verifyAdminCredentials,
} from "@/lib/db-admin";
import {
  clearAdminSessionCookie,
  getAdminSession,
  setAdminSessionCookie,
} from "@/lib/admin-session";
import type { AdminSession } from "@/lib/types";

export async function ensureAdminBootstrap() {
  await seedAdminAccountIfEmpty();
}

export async function loginAdmin(username: string, password: string) {
  await ensureAdminBootstrap();
  const account = await verifyAdminCredentials(username, password);
  if (!account) return null;
  const session: AdminSession = { adminId: account.id, username: account.username };
  await setAdminSessionCookie(session);
  return session;
}

export async function logoutAdmin() {
  await clearAdminSessionCookie();
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminSessionApi(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new AdminUnauthorizedError();
  }
  return session;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminUnauthorizedError";
  }
}

export async function getAdminAccount(username: string) {
  await ensureAdminBootstrap();
  return getAdminAccountByUsername(username);
}
