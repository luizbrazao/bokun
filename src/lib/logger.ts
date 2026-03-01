import pino from "pino";

export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(bindings: {
  tenantId: string;
  channel: string;
  requestId: string;
  correlationId?: string;
  messageId?: string;
  providerMessageId?: string;
  event?: string;
}) {
  return rootLogger.child(bindings);
}

export default rootLogger;
