import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/admin-auth";
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const result = await loginAdmin(username, password);
    if (!result) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, result.token, getAdminSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    const message = error instanceof Error ? error.message : "Unable to sign in";
    const isConfig = message.includes("AUTH_SECRET") || message.includes("ADMIN_SESSION_SECRET");
    const isDbHost =
      message.includes("ENOTFOUND") ||
      message.includes("getaddrinfo") ||
      message.includes("db.") && message.includes("supabase.co");
    return NextResponse.json(
      {
        error: isConfig
          ? "Server is missing AUTH_SECRET. Add it in Vercel environment variables and redeploy."
          : isDbHost
            ? "Database host unreachable. In Vercel, set DATABASE_URL to the Supabase Transaction pooler URI (not db.*.supabase.co), then redeploy."
            : "Unable to sign in. Check server logs.",
      },
      { status: isConfig ? 503 : 500 },
    );
  }
}
