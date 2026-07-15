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

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return securityResponse({ error: "Invalid request origin." }, 403);
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return securityResponse({ error: "Invalid request body." }, 400);
  }

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return securityResponse({ error: "Invalid access password." }, 401);
  }

  const session = createAdminSession();
  if (!session) {
    return securityResponse({ error: "Password sessions are not configured." }, 503);
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

export async function DELETE(request: Request) {
  if (!hasValidOrigin(request)) {
    return securityResponse({ error: "Invalid request origin." }, 403);
  }

  const response = securityResponse({ ok: "true" }, 200);
  response.cookies.set({
    name: "recomp_admin_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
