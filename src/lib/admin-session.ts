import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminSession } from "@/lib/types";

export const ADMIN_SESSION_COOKIE = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or AUTH_SECRET must be set for admin sessions.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(session: AdminSession) {
  return new SignJWT({ adminId: session.adminId, username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const adminId = String(payload.adminId ?? "");
    const username = String(payload.username ?? "");
    if (!adminId || !username) return null;
    return { adminId, username };
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function createAdminSessionToken(session: AdminSession) {
  return signAdminSession(session);
}

export async function setAdminSessionCookie(session: AdminSession) {
  const token = await createAdminSessionToken(session);
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());
}

export async function clearAdminSessionCookie() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

export function assertAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET or ADMIN_SESSION_SECRET on the server.");
  }
}
