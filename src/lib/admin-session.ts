import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminSession } from "@/lib/types";

const COOKIE_NAME = "admin_session";
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

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function setAdminSessionCookie(session: AdminSession) {
  const token = await signAdminSession(session);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
