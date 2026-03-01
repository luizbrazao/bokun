import { RateLimiterMemory } from "rate-limiter-flexible";

// Swappable interface — replace the backing implementation without changing callers
export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean }>;
}

// Conservative defaults: 10 messages per 60 seconds per user
// This is a UX/backpressure guardrail only — NOT a security control
const MAX = Number(process.env.RATE_LIMIT_MAX ?? "10");
const WINDOW_SEC = Math.ceil(Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000") / 1000);

const _limiter = new RateLimiterMemory({
  points: MAX,
  duration: WINDOW_SEC,
});

export const inboundMessageLimiter: RateLimiter = {
  async check(key: string): Promise<{ allowed: boolean }> {
    try {
      await _limiter.consume(key);
      return { allowed: true };
    } catch {
      // RateLimiterRes thrown when limit exceeded
      return { allowed: false };
    }
  },
};
