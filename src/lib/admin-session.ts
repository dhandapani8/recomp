import { createHmac, randomBytes } from "node:crypto";

import { secretsMatch } from "@/lib/api-auth";

const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.RECOMP_SESSION_SECRET;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSession() {
  const secret = sessionSecret();
  if (!secret) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const nonce = randomBytes(24).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function isValidAdminSession(token: string | undefined) {
  const secret = sessionSecret();
  if (!token || !secret) return false;

  const [expiresAtRaw, nonce, receivedSignature] = token.split(".");
  if (!expiresAtRaw || !nonce || !receivedSignature || token.split(".").length !== 3) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${expiresAtRaw}.${nonce}`;
  return secretsMatch(receivedSignature, signature(payload, secret));
}

export function verifyAdminPassword(candidate: string) {
  const password = process.env.RECOMP_PASSWORD;
  return Boolean(password && secretsMatch(candidate, password));
}

export const adminSessionMaxAge = SESSION_DURATION_SECONDS;
