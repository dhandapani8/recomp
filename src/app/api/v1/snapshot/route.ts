import { authorizeApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { getRecompSnapshot } from "@/lib/recomp-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store, private",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  Vary: "Authorization",
};

export async function GET(request: Request) {
  const authorization = authorizeApiRequest(request);

  if (!authorization.ok) {
    return Response.json(
      { error: authorization.message },
      {
        status: authorization.status,
        headers: {
          ...SECURITY_HEADERS,
          ...(authorization.status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
        },
      },
    );
  }

  const rateLimit = checkRateLimit(authorization.keyFingerprint);

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again shortly." },
      {
        status: 429,
        headers: {
          ...SECURITY_HEADERS,
          "RateLimit-Limit": "60",
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      },
    );
  }

  return Response.json(getRecompSnapshot(), {
    headers: {
      ...SECURITY_HEADERS,
      "RateLimit-Limit": "60",
      "RateLimit-Remaining": String(rateLimit.remaining),
      "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
    },
  });
}
