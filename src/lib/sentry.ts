import * as Sentry from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn?.trim()) return; // Dev mode — no credentials needed, works without Sentry
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    // Deliberately omit tracesSampleRate — errors only, no performance tracing (per locked decision)
  });
}

export function captureError(
  error: unknown,
  ctx: {
    tenantId: string;
    handler: string;
    messageId?: string;
    waUserId?: string;
  }
): void {
  Sentry.withScope((scope) => {
    scope.setTag("tenantId", ctx.tenantId);
    scope.setTag("handler", ctx.handler);
    if (ctx.messageId) scope.setTag("messageId", ctx.messageId);
    // waUserId is a phone number ID — not PII in the context of this system
    if (ctx.waUserId) scope.setTag("waUserId", ctx.waUserId);
    Sentry.captureException(error);
  });
}
