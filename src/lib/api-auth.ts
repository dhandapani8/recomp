import { createHash, timingSafeEqual } from "node:crypto";

type AuthorizationResult =
  | { ok: true; keyFingerprint: string }
  | { ok: false; status: 401 | 503; message: string };

export function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function authorizeApiRequest(request: Request): AuthorizationResult {
  const apiKey = process.env.RECOMP_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      message: "Agent API is not configured.",
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);

  if (!match || !secretsMatch(match[1], apiKey)) {
    return {
      ok: false,
      status: 401,
      message: "A valid bearer token is required.",
    };
  }

  return {
    ok: true,
    // Never retain or log a raw key. This is only useful for rate-limit buckets.
    keyFingerprint: createHash("sha256").update(apiKey).digest("hex").slice(0, 16),
  };
}
