import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const OPTION_MAP_TTL_MS = 15 * 60_000;

type StoredOptionMap = {
  kind: "time_options_v1";
  createdAt: number;
  tz: "Europe/Madrid";
  activityId: number;
  options: Array<{
    optionId: string;
    availabilityId: string;
    activityId: number;
    startTimeId: number;
    dateKey: string;
    display: string;
    meta: {
      availabilityCount: number;
      minParticipants: number;
      defaultRateId?: number;
      rateTitle?: string;
      pickupSelectionType?: string;
    };
  }>;
};

type PickupOptionMapEntry = {
  index: number;
  pickupPlaceId?: string | number;
};

function assertNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertYmdDate(value: string, fieldName: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toOptionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidStoredOptionMap(optionMap: unknown): optionMap is StoredOptionMap {
  if (!isRecord(optionMap)) {
    return false;
  }

  if (optionMap.kind !== "time_options_v1") {
    return false;
  }

  if (!isFiniteNumber(optionMap.createdAt) || !isFiniteNumber(optionMap.activityId)) {
    return false;
  }

  if (optionMap.tz !== "Europe/Madrid" || !Array.isArray(optionMap.options)) {
    return false;
  }

  return optionMap.options.every((option) => {
    if (!isRecord(option)) {
      return false;
    }

    if (
      typeof option.optionId !== "string" ||
      option.optionId.trim().length === 0 ||
      typeof option.availabilityId !== "string" ||
      option.availabilityId.trim().length === 0 ||
      !isFiniteNumber(option.activityId) ||
      !isFiniteNumber(option.startTimeId) ||
      typeof option.dateKey !== "string" ||
      option.dateKey.trim().length === 0 ||
      typeof option.display !== "string"
    ) {
      return false;
    }

    if (!isRecord(option.meta)) {
      return false;
    }

    if (!isFiniteNumber(option.meta.availabilityCount) || !isFiniteNumber(option.meta.minParticipants)) {
      return false;
    }

    const defaultRateId = option.meta.defaultRateId;
    const rateTitle = option.meta.rateTitle;
    const pickupSelectionType = option.meta.pickupSelectionType;

    if (defaultRateId !== undefined && !isFiniteNumber(defaultRateId)) {
      return false;
    }

    if (rateTitle !== undefined && typeof rateTitle !== "string") {
      return false;
    }

    if (pickupSelectionType !== undefined && typeof pickupSelectionType !== "string") {
      return false;
    }

    return true;
  });
}

function isValidPickupOptionMap(optionMap: unknown): optionMap is PickupOptionMapEntry[] {
  if (!Array.isArray(optionMap)) {
    return false;
  }

  return optionMap.every((entry: unknown) => {
    if (!isRecord(entry)) {
      return false;
    }

    const rec = entry as Record<string, unknown>;
    if (!Number.isInteger(rec.index) || (rec.index as number) < 1) {
      return false;
    }

    if (
      rec.pickupPlaceId !== undefined &&
      typeof rec.pickupPlaceId !== "string" &&
      typeof rec.pickupPlaceId !== "number"
    ) {
      return false;
    }

    return true;
  });
}

function parseSelectedIndex(raw: string | number): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) ? raw : null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export const getBookingDraftByWaUserId = query({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();
  },
});

export const getBookingDraftById = query({
  args: {
    bookingDraftId: v.id("booking_drafts"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.bookingDraftId);
  },
});

export const upsertBookingDraftBase = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    assertNonEmptyString(args.activityId, "activityId");
    assertNonEmptyString(args.date, "date");
    assertYmdDate(args.date, "date");

    const now = Date.now();
    const existing = await ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        activityId: args.activityId,
        date: args.date,
        startTimeId: undefined,
        lastOptionMap: undefined,
        lastOptionMapUpdatedAt: undefined,
        selectedAvailabilityId: undefined,
        selectedStartTimeId: undefined,
        selectedDateKey: undefined,
        selectedRateId: undefined,
        selectedPickupSelectionType: undefined,
        lastPickupOptionMap: undefined,
        lastPickupOptionMapUpdatedAt: undefined,
        participants: undefined,
        bokunSessionId: undefined,
        bokunBookingId: undefined,
        bokunConfirmationCode: undefined,
        bokunBookingUrl: undefined,
        nextStep: "select_time",
        pickupPlaceId: undefined,
        status: "draft",
        confirmedAt: undefined,
        updatedAt: now,
      });

      return existing._id;
    }

    return ctx.db.insert("booking_drafts", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      activityId: args.activityId,
      date: args.date,
      nextStep: "select_time",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setLastOptionMap = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    optionMap: v.any(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    if (!isValidStoredOptionMap(args.optionMap)) {
      throw new Error("Invalid optionMap payload.");
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      lastOptionMap: args.optionMap,
      lastOptionMapUpdatedAt: now,
      updatedAt: now,
    });

    return true;
  },
});

export const setLastPickupOptionMap = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    optionMap: v.array(
      v.object({
        index: v.number(),
        pickupPlaceId: v.optional(v.union(v.string(), v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    if (!isValidPickupOptionMap(args.optionMap)) {
      throw new Error("Invalid pickup optionMap payload.");
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      lastPickupOptionMap: args.optionMap,
      lastPickupOptionMapUpdatedAt: now,
      nextStep: "select_pickup",
      updatedAt: now,
    });

    return true;
  },
});

export const setSelectedPickupFromOption = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    selectedIndex: v.union(v.number(), v.string()),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    if (!draft.lastPickupOptionMap || !draft.lastPickupOptionMapUpdatedAt) {
      return { ok: false as const, reason: "OPTION_MAP_MISSING" as const };
    }

    const now = Date.now();
    if (now - draft.lastPickupOptionMapUpdatedAt > OPTION_MAP_TTL_MS) {
      await ctx.db.patch(draft._id, {
        lastPickupOptionMap: undefined,
        lastPickupOptionMapUpdatedAt: undefined,
        updatedAt: now,
      });

      return { ok: false as const, reason: "OPTION_MAP_EXPIRED" as const };
    }

    const selectedIndex = parseSelectedIndex(args.selectedIndex);
    if (selectedIndex === null || selectedIndex < 1) {
      return { ok: false as const, reason: "OPTION_INVALID" as const };
    }

    const selectedEntry = draft.lastPickupOptionMap.find((entry) => entry.index === selectedIndex);
    if (!selectedEntry) {
      return { ok: false as const, reason: "OPTION_NOT_FOUND" as const };
    }

    if (
      selectedEntry.pickupPlaceId === undefined ||
      (typeof selectedEntry.pickupPlaceId !== "string" && typeof selectedEntry.pickupPlaceId !== "number")
    ) {
      return { ok: false as const, reason: "OPTION_INVALID" as const };
    }

    await ctx.db.patch(draft._id, {
      pickupPlaceId: selectedEntry.pickupPlaceId,
      lastPickupOptionMap: undefined,
      lastPickupOptionMapUpdatedAt: undefined,
      nextStep: "ask_participants",
      status: "draft",
      updatedAt: now,
    });

    return {
      ok: true as const,
      pickupPlaceId: selectedEntry.pickupPlaceId,
    };
  },
});

export const setSelectedTimeFromOption = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    optionId: v.string(),
  },
  handler: async (ctx, args) => {
    const optionId = args.optionId.trim();
    if (optionId.length === 0) {
      return { ok: false as const, reason: "OPTION_NOT_FOUND" as const };
    }

    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    if (!draft.lastOptionMap || !draft.lastOptionMapUpdatedAt) {
      return { ok: false as const, reason: "OPTION_MAP_MISSING" as const };
    }

    const now = Date.now();
    if (now - draft.lastOptionMapUpdatedAt > OPTION_MAP_TTL_MS) {
      await ctx.db.patch(draft._id, {
        lastOptionMap: undefined,
        lastOptionMapUpdatedAt: undefined,
        updatedAt: now,
      });

      return { ok: false as const, reason: "OPTION_MAP_EXPIRED" as const };
    }

    const selectedOption = draft.lastOptionMap.options.find((option) => option.optionId === optionId);
    if (!selectedOption) {
      return { ok: false as const, reason: "OPTION_NOT_FOUND" as const };
    }

    if (!isFiniteNumber(selectedOption.startTimeId)) {
      return { ok: false as const, reason: "OPTION_INVALID" as const };
    }

    const selectedRateId = isFiniteNumber(selectedOption.meta.defaultRateId)
      ? selectedOption.meta.defaultRateId
      : undefined;
    const selectedPickupSelectionType = toOptionalNonEmptyString(selectedOption.meta.pickupSelectionType);
    const nextStep =
      selectedPickupSelectionType === "UNAVAILABLE"
        ? "ask_participants"
        : selectedPickupSelectionType !== undefined
          ? "select_pickup"
          : undefined;

    await ctx.db.patch(draft._id, {
      startTimeId: selectedOption.startTimeId,
      date: selectedOption.dateKey,
      selectedAvailabilityId: selectedOption.availabilityId,
      selectedStartTimeId: selectedOption.startTimeId,
      selectedDateKey: selectedOption.dateKey,
      selectedRateId,
      selectedPickupSelectionType,
      pickupPlaceId: undefined,
      participants: undefined,
      bokunSessionId: undefined,
      bokunBookingId: undefined,
      bokunConfirmationCode: undefined,
      bokunBookingUrl: undefined,
      ...(nextStep !== undefined ? { nextStep } : {}),
      lastOptionMap: undefined,
      lastOptionMapUpdatedAt: undefined,
      lastPickupOptionMap: undefined,
      lastPickupOptionMapUpdatedAt: undefined,
      status: "draft",
      updatedAt: now,
    });

    return {
      ok: true as const,
      selectedAvailabilityId: selectedOption.availabilityId,
      selectedStartTimeId: selectedOption.startTimeId,
      selectedDateKey: selectedOption.dateKey,
      selectedRateId,
      selectedPickupSelectionType,
    };
  },
});

export const setNextStep = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    nextStep: v.union(
      v.literal("select_time"),
      v.literal("select_pickup"),
      v.literal("ask_participants"),
      v.literal("ask_booking_questions"),
      v.literal("collect_booking_answers"),
      v.literal("confirm")
    ),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    await ctx.db.patch(draft._id, {
      nextStep: args.nextStep,
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

export const setParticipants = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    participants: v.number(),
  },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.participants) || args.participants < 1) {
      throw new Error("participants must be an integer greater than or equal to 1.");
    }

    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    await ctx.db.patch(draft._id, {
      participants: args.participants,
      status: "draft",
      nextStep: "confirm",
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

export const setBokunSessionId = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    bokunSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    const sessionId = args.bokunSessionId.trim();
    if (sessionId.length === 0) {
      throw new Error("bokunSessionId must be a non-empty string.");
    }

    await ctx.db.patch(draft._id, {
      bokunSessionId: sessionId,
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

export const setBokunBookingResult = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    bokunBookingId: v.optional(v.string()),
    bokunConfirmationCode: v.optional(v.string()),
    bokunBookingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    await ctx.db.patch(draft._id, {
      bokunBookingId: args.bokunBookingId,
      bokunConfirmationCode: args.bokunConfirmationCode,
      bokunBookingUrl: args.bokunBookingUrl,
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

// confirmDraft: mutation to finalize a draft after user confirmation.
export const confirmDraft = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      status: "confirmed",
      nextStep: undefined,
      confirmedAt: now,
      updatedAt: now,
    });

    return draft._id;
  },
});

export const abandonDraft = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    await ctx.db.patch(draft._id, {
      status: "abandoned",
      nextStep: undefined,
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

export const upsertBookingDraftSelectionTime = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    activityId: v.string(),
    date: v.string(),
    startTimeId: v.union(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");
    assertNonEmptyString(args.activityId, "activityId");
    assertNonEmptyString(args.date, "date");
    assertYmdDate(args.date, "date");

    const now = Date.now();
    const existing = await ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    const selectedStartTimeId = isFiniteNumber(args.startTimeId) ? args.startTimeId : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        activityId: args.activityId,
        date: args.date,
        startTimeId: args.startTimeId,
        selectedStartTimeId,
        selectedDateKey: args.date,
        selectedAvailabilityId: undefined,
        selectedRateId: undefined,
        selectedPickupSelectionType: undefined,
        lastOptionMap: undefined,
        lastOptionMapUpdatedAt: undefined,
        lastPickupOptionMap: undefined,
        lastPickupOptionMapUpdatedAt: undefined,
        pickupPlaceId: undefined,
        participants: undefined,
        bokunSessionId: undefined,
        bokunBookingId: undefined,
        bokunConfirmationCode: undefined,
        bokunBookingUrl: undefined,
        nextStep: "select_pickup",
        status: "draft",
        confirmedAt: undefined,
        updatedAt: now,
      });

      return existing._id;
    }

    return ctx.db.insert("booking_drafts", {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      activityId: args.activityId,
      date: args.date,
      startTimeId: args.startTimeId,
      selectedStartTimeId,
      selectedDateKey: args.date,
      bokunSessionId: undefined,
      bokunBookingId: undefined,
      bokunConfirmationCode: undefined,
      bokunBookingUrl: undefined,
      nextStep: "select_pickup",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertBookingDraftPickupPlace = mutation({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    pickupPlaceId: v.union(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    assertNonEmptyString(args.waUserId, "waUserId");

    const draft = await ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId)
      )
      .first();

    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    await ctx.db.patch(draft._id, {
      pickupPlaceId: args.pickupPlaceId,
      lastPickupOptionMap: undefined,
      lastPickupOptionMapUpdatedAt: undefined,
      nextStep: "ask_participants",
      status: "draft",
      updatedAt: Date.now(),
    });

    return draft._id;
  },
});

export const setBookingQuestions = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    questions: v.string(), // JSON-stringified BookingQuestion[]
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      bookingQuestions: args.questions,
      bookingAnswers: undefined, // Clear any previous answers
      updatedAt: now,
    });

    return draft._id;
  },
});

export const setBookingAnswers = mutation({
  args: {
    bookingDraftId: v.id("booking_drafts"),
    answers: v.string(), // JSON-stringified { [questionId]: answer }
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.bookingDraftId);
    if (!draft) {
      throw new Error("Booking draft not found.");
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      bookingAnswers: args.answers,
      nextStep: "confirm",
      updatedAt: now,
    });

    return draft._id;
  },
});
