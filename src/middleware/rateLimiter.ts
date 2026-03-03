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

// Server-to-server webhook rate limiter — much higher limits than end-user messages.
// Stripe and Bokun are robust servers that handle 429 with exponential backoff.
// Key is a constant string ("bokun" or "stripe") since traffic comes from a single source.
const SERVER_WEBHOOK_MAX = Number(process.env.SERVER_WEBHOOK_RATE_MAX ?? "300");
const SERVER_WEBHOOK_WINDOW_SEC = Math.ceil(
  Number(process.env.SERVER_WEBHOOK_RATE_WINDOW_MS ?? "60000") / 1000
);

const _serverLimiter = new RateLimiterMemory({
  points: SERVER_WEBHOOK_MAX,
  duration: SERVER_WEBHOOK_WINDOW_SEC,
});

export const serverWebhookLimiter: RateLimiter = {
  async check(key: string): Promise<{ allowed: boolean }> {
    try {
      await _serverLimiter.consume(key);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  },
};
