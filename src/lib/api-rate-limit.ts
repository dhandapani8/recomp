type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: entry.resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - current.count),
    resetAt: current.resetAt,
  };
}
