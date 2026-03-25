import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  tenants: defineTable({
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    externalVendorId: v.optional(v.string()), // Bokun vendor_id — used for idempotent re-installation
    inviteCode: v.optional(v.string()),
    openaiApiKey: v.optional(v.string()),
    openaiModel: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeStatus: v.optional(v.string()), // "active" | "past_due" | "canceled" | "trialing" etc. (Stripe uses American English "canceled" — one L)
    stripeCurrentPeriodEnd: v.optional(v.number()), // Unix timestamp in SECONDS from Stripe (not milliseconds)
    businessName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    timezone: v.optional(v.string()), // IANA timezone e.g. "Europe/Lisbon"; defaults to "Europe/Madrid" at runtime
    language: v.optional(v.string()), // "pt" | "en" | "es"
    createdAt: v.number(),
  })
    .index("by_externalVendorId", ["externalVendorId"]),

  user_tenants: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("viewer")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_userId_tenantId", ["userId", "tenantId"]),

  bokun_installations: defineTable({
    tenantId: v.id("tenants"),
    baseUrl: v.string(),
    authHeaders: v.record(v.string(), v.string()),
    scopes: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenantId", ["tenantId"]),

  provider_installations: defineTable({
    tenantId: v.id("tenants"),
    provider: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    baseUrl: v.string(),
    authHeaders: v.record(v.string(), v.string()),
    scopes: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_provider", ["tenantId", "provider"])
    .index("by_provider", ["provider"]),

  conversations: defineTable({
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    lastActivityId: v.optional(v.string()),
    lastDate: v.optional(v.string()),
    lastOptionMap: v.optional(
      v.array(
        v.object({
          index: v.number(),
          startTimeId: v.optional(v.union(v.string(), v.number())),
        })
      )
    ),
    lastOptionMapUpdatedAt: v.optional(v.number()),
    lastPickupOptionMap: v.optional(
      v.array(
        v.object({
          index: v.number(),
          pickupPlaceId: v.optional(v.union(v.string(), v.number())),
        })
      )
    ),
    lastPickupOptionMapUpdatedAt: v.optional(v.number()),
    handoffState: v.optional(v.union(v.literal("active"), v.literal("idle"))),
    handoffOperatorMessageId: v.optional(v.number()),
    handoffChannel: v.optional(v.string()),
    pendingAction: v.optional(v.union(v.literal("cancel_code"), v.literal("edit_code"))),
    pendingActionUpdatedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_tenantId_waUserId", ["tenantId", "waUserId"])
    .index("by_createdAt", ["createdAt"]),

  booking_drafts: defineTable({
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.string(),
    date: v.string(),
    startTimeId: v.optional(v.union(v.string(), v.number())),
    lastOptionMap: v.optional(
      v.object({
        kind: v.literal("time_options_v1"),
        createdAt: v.number(),
        tz: v.string(),
        activityId: v.number(),
        options: v.array(
          v.object({
            optionId: v.string(),
            availabilityId: v.string(),
            activityId: v.number(),
            startTimeId: v.number(),
            dateKey: v.string(),
            display: v.string(),
            meta: v.object({
              availabilityCount: v.number(),
              minParticipants: v.number(),
              defaultRateId: v.optional(v.number()),
              rateTitle: v.optional(v.string()),
              pickupSelectionType: v.optional(v.string()),
            }),
          })
        ),
      })
    ),
    lastOptionMapUpdatedAt: v.optional(v.number()),
    lastPickupOptionMap: v.optional(
      v.array(
        v.object({
          index: v.number(),
          pickupPlaceId: v.optional(v.union(v.string(), v.number())),
        })
      )
    ),
    lastPickupOptionMapUpdatedAt: v.optional(v.number()),
    selectedAvailabilityId: v.optional(v.string()),
    selectedStartTimeId: v.optional(v.number()),
    selectedDateKey: v.optional(v.string()),
    selectedRateId: v.optional(v.number()),
    selectedPickupSelectionType: v.optional(v.string()),
    participants: v.optional(v.number()),
    bookingQuestions: v.optional(v.string()), // JSON-stringified BookingQuestion[]
    bookingAnswers: v.optional(v.string()),   // JSON-stringified { [questionId]: answer }
    bokunSessionId: v.optional(v.string()),
    bokunBookingId: v.optional(v.string()),
    bokunConfirmationCode: v.optional(v.string()),
    bokunBookingUrl: v.optional(v.string()),
    nextStep: v.optional(
      v.union(
        v.literal("select_time"),
        v.literal("select_pickup"),
        v.literal("ask_participants"),
        v.literal("ask_booking_questions"),
        v.literal("collect_booking_answers"),
        v.literal("confirm")
      )
    ),
    pickupPlaceId: v.optional(v.union(v.string(), v.number())),
    status: v.union(v.literal("draft"), v.literal("abandoned"), v.literal("confirmed")),
    confirmedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_tenantId_waUserId", ["tenantId", "waUserId"])
    .index("by_createdAt", ["createdAt"]),

  whatsapp_channels: defineTable({
    tenantId: v.id("tenants"),
    phoneNumberId: v.string(),
    wabaId: v.string(),
    accessToken: v.string(),
    verifyToken: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phoneNumberId", ["phoneNumberId"])
    .index("by_tenantId", ["tenantId"]),

  telegram_channels: defineTable({
    tenantId: v.id("tenants"),
    botToken: v.string(),
    botUsername: v.string(),
    webhookSecret: v.string(),
    operatorGroupChatId: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_botUsername", ["botUsername"]),

  oauth_states: defineTable({
    state: v.string(),
    redirectUrl: v.optional(v.string()),
    bokunEnvironment: v.optional(v.string()),
    bokunDomain: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_state", ["state"]),

  webhook_dedup: defineTable({
    tenantId: v.id("tenants"),
    key: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenantId_key", ["tenantId", "key"])
    .index("by_createdAt", ["createdAt"]),

  stripe_event_dedup: defineTable({
    eventId: v.string(), // Stripe event.id (e.g., "evt_abc123")
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_createdAt", ["createdAt"]),

  failed_webhooks: defineTable({
    source: v.union(v.literal("whatsapp"), v.literal("bokun"), v.literal("stripe")),
    payloadHash: v.string(), // SHA256 of raw body — never store raw payload (may contain PII)
    errorReason: v.string(), // human-readable error message or error class name
    eventType: v.optional(v.string()), // e.g., "checkout.session.completed" or Bokun topic
    retryCount: v.number(), // starts at 0; incremented on manual retry
    status: v.union(
      v.literal("failed"),
      v.literal("retried"),
      v.literal("resolved")
    ),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source", ["source"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  audit_log: defineTable({
    tenantId: v.id("tenants"),
    event: v.string(), // "booking_confirmed" | "booking_cancelled" | "booking_started" | "booking_failed" | "tenant_onboarded" | "bot_toggled"
    waUserId: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
    bookingDraftId: v.optional(v.id("booking_drafts")),
    meta: v.optional(v.string()), // JSON-stringified additional context (no PII — no message content)
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_event", ["tenantId", "event"])
    .index("by_createdAt", ["createdAt"]),

  chat_messages: defineTable({
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool")
    ),
    content: v.string(),
    toolCalls: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId_waUserId", ["tenantId", "waUserId"])
    .index("by_createdAt", ["createdAt"]),
});
