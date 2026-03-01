import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("cleanup webhook dedup", { hourUTC: 3, minuteUTC: 0 }, internal.cleanup.cleanupWebhookDedup, {});

crons.daily(
  "cleanup conversation data",
  { hourUTC: 3, minuteUTC: 30 },
  internal.cleanup.cleanupConversationData,
  {}
);

crons.monthly(
  "cleanup audit log",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.cleanup.cleanupAuditLog,
  {}
);

export default crons;
