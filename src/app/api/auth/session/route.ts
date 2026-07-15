import { NextResponse } from "next/server";

import {
  adminSessionMaxAge,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-session";

export const runtime = "nodejs";

function securityResponse(body: Record<string, string>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return securityResponse({ error: "Invalid request origin." }, 403);
      }
    } catch {
      return securityResponse({ error: "Invalid request origin." }, 403);
    }
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return securityResponse({ error: "Invalid request body." }, 400);
  }

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return securityResponse({ error: "Invalid password." }, 401);
  }

  const session = createAdminSession();
  if (!session) {
    return securityResponse({ error: "Admin sessions are not configured." }, 503);
  }

  const response = securityResponse({ ok: "true" }, 200);
  response.cookies.set({
    name: "recomp_admin_session",
    value: session,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAge,
  });
  return response;
}
