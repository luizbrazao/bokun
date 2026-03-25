import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantMembership } from "./userTenants";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

export const listBookingDrafts = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("booking_drafts")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .take(100);
  },
});

export const listConversations = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .take(100);

    const recentMessages = await ctx.db
      .query("chat_messages")
      .withIndex("by_tenantId_waUserId", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(500);

    const conversationMap = new Map<string, (typeof conversations)[number]>();
    for (const conv of conversations) {
      conversationMap.set(conv.waUserId, conv);
    }
    for (const msg of recentMessages) {
      if (!conversationMap.has(msg.waUserId)) {
        conversationMap.set(msg.waUserId, {
          _id: `synthetic_${msg.waUserId}` as any,
          tenantId: args.tenantId,
          waUserId: msg.waUserId,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt,
        } as any);
      }
    }

    const merged = Array.from(conversationMap.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 100);

    const enriched = await Promise.all(
      merged.map(async (conv) => {
        const lastMsg = await ctx.db
          .query("chat_messages")
          .withIndex("by_tenantId_waUserId", (q) =>
            q.eq("tenantId", args.tenantId).eq("waUserId", conv.waUserId),
          )
          .order("desc")
          .first();
        return {
          ...conv,
          lastMessage: lastMsg
            ? {
                content:
                  lastMsg.content.length > 80
                    ? lastMsg.content.slice(0, 80) + "..."
                    : lastMsg.content,
                role: lastMsg.role,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );
    return enriched;
  },
});

export const getWhatsAppChannel = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("whatsapp_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const getBokunInstallation = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const installation = await ctx.db
      .query("bokun_installations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!installation) return null;
    return {
      _id: installation._id,
      baseUrl: installation.baseUrl,
      scopes: installation.scopes,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt,
    };
  },
});

export const getTenantInfo = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db.get(args.tenantId);
  },
});

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asIsoDateString(value: unknown): string | undefined {
  const str = asString(value);
  if (str) return str;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function asDateOnlyString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    return undefined;
  }

  const str = asString(value);
  if (!str) return undefined;
  const isoDateMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return undefined;
}

function getFirstString(record: JsonRecord | null, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function getFirstDateString(record: JsonRecord | null, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = asIsoDateString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function getFirstDateOnlyString(record: JsonRecord | null, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = asDateOnlyString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function normalizeDisplayStatus(rawStatus: string | undefined, paymentStatus: string | undefined): string {
  const status = (rawStatus ?? "").toUpperCase();
  const payment = (paymentStatus ?? "").toUpperCase();

  if (status === "CANCELLED" || status === "ABORTED" || status === "NO_SHOW") {
    return status;
  }

  if (status === "RESERVED" || status === "REQUESTED" || status === "DRAFT") {
    return "PENDING";
  }

  if (
    payment === "NOT_PAID" ||
    payment === "PARTIALLY_PAID" ||
    payment === "DEPOSIT_PAID" ||
    payment === "DEPOSIT"
  ) {
    return "PENDING";
  }

  if (status) return status;
  return "UNKNOWN";
}

function formatBokunDateUTC(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    " ",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
    ":",
    pad(date.getUTCSeconds()),
  ].join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 0x3f];
    output += alphabet[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 0x3f] : "=";
    output += i + 2 < bytes.length ? alphabet[triplet & 0x3f] : "=";
  }
  return output;
}

async function makeBokunSignature(args: {
  date: string;
  accessKey: string;
  secretKey: string;
  method: string;
  pathWithQuery: string;
}): Promise<string> {
  const input = `${args.date}${args.accessKey}${args.method.toUpperCase()}${args.pathWithQuery}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(args.secretKey);
  const payload = encoder.encode(input);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payload);
  return bytesToBase64(new Uint8Array(signatureBuffer));
}

function getHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

async function buildBokunHeaders(
  baseHeaders: Record<string, string>,
  method: string,
  pathWithQuery: string,
): Promise<Record<string, string>> {
  const accessKey = getHeaderValue(baseHeaders, "x-bokun-accesskey")?.trim();
  const secretKey = getHeaderValue(baseHeaders, "x-bokun-secretkey")?.trim();
  if (!accessKey || !secretKey) {
    return { ...baseHeaders };
  }

  const date = formatBokunDateUTC(new Date());
  const signature = await makeBokunSignature({
    date,
    accessKey,
    secretKey,
    method,
    pathWithQuery,
  });

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(baseHeaders)) {
    const lower = key.toLowerCase();
    if (
      lower === "x-bokun-accesskey" ||
      lower === "x-bokun-secretkey" ||
      lower === "x-bokun-date" ||
      lower === "x-bokun-signature"
    ) {
      continue;
    }
    sanitized[key] = value;
  }

  sanitized["X-Bokun-Date"] = date;
  sanitized["X-Bokun-AccessKey"] = accessKey;
  sanitized["X-Bokun-Signature"] = signature;
  return sanitized;
}

function toIsoRangeStart(dateInput: string): string {
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
  }
  return parsed.toISOString();
}

function toIsoRangeEnd(dateInput: string): string {
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T23:59:59.999Z`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return `${now.toISOString().slice(0, 10)}T23:59:59.999Z`;
  }
  return parsed.toISOString();
}

export const listBokunBookingsByPeriod = action({
  args: {
    tenantId: v.id("tenants"),
    fromDate: v.string(),
    toDate: v.string(),
    statuses: v.optional(v.array(v.string())),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const mine = await ctx.runQuery(api.userTenants.getMyTenant, {});
    if (!mine || mine._id !== args.tenantId) {
      throw new Error("Acesso negado.");
    }

    const context = await ctx.runQuery(internal.providerInstallations.getProviderContext, {
      tenantId: args.tenantId,
      provider: "bokun",
    });
    if (!context) return { items: [], totalHits: 0, tookInMillis: 0 };

    const body: Record<string, unknown> = {
      page: Math.max(1, Math.floor(args.page ?? 1)),
      pageSize: Math.max(1, Math.min(100, Math.floor(args.pageSize ?? 50))),
      creationDateRange: {
        from: toIsoRangeStart(args.fromDate),
        to: toIsoRangeEnd(args.toDate),
        includeLower: true,
        includeUpper: true,
      },
    };

    const statuses = (args.statuses ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
    if (statuses.length > 0) {
      body.bookingStatuses = statuses;
    }

    const path = "/booking.json/booking-search";
    const url = new URL(path, context.baseUrl);
    const headers = await buildBokunHeaders(context.headers ?? {}, "POST", path);
    headers["Content-Type"] = "application/json";

    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Bokun booking-search failed (${response.status}): ${errorText}`);
    }

    const raw = (await response.json()) as unknown;
    const payload = asRecord(raw) ?? {};
    const itemsRaw = Array.isArray(payload.items) ? payload.items : [];

    const items = itemsRaw
      .map((entry) => {
        const item = asRecord(entry);
        if (!item) return null;

        const customer = asRecord(item.customer);
        const productBookings = Array.isArray(item.productBookings) ? item.productBookings : [];
        const firstProductBooking = asRecord(productBookings[0]);
        const firstProductInfo = asRecord(firstProductBooking?.product);
        const firstStartDate =
          getFirstDateOnlyString(firstProductBooking, ["startDate", "date", "activityDate"]) ??
          getFirstDateOnlyString(item, ["startDate", "date", "activityDate", "travelDate"]) ??
          getFirstDateString(firstProductBooking, ["startDateTime", "endDateTime"]) ??
          getFirstDateString(item, ["startDateTime", "endDateTime"]);
        const firstStartDateTime =
          getFirstDateString(firstProductBooking, ["startDateTime", "startDate", "date", "activityDate"]) ??
          getFirstDateString(item, ["startDateTime", "startDate", "date", "activityDate", "travelDate"]);
        const startDateFromAnyProduct = !firstStartDate
          ? productBookings
              .map((pb) =>
                getFirstDateOnlyString(asRecord(pb), ["startDate", "date", "activityDate"]) ??
                getFirstDateString(asRecord(pb), ["startDateTime", "endDateTime"]),
              )
              .find((value): value is string => Boolean(value))
          : undefined;
        const startDateTimeFromAnyProduct = !firstStartDateTime
          ? productBookings
              .map((pb) =>
                getFirstDateString(asRecord(pb), ["startDateTime", "startDate", "date", "activityDate"]),
              )
              .find((value): value is string => Boolean(value))
          : undefined;
        const firstStatus = asString(firstProductBooking?.status);
        const itemStatus =
          getFirstString(item, ["bookingStatus", "status"]) ??
          firstStatus ??
          undefined;
        const paymentStatus =
          getFirstString(item, ["paymentStatus", "paidType"]) ??
          getFirstString(firstProductBooking, ["paymentStatus", "paidType"]) ??
          undefined;
        const displayStatus = normalizeDisplayStatus(itemStatus, paymentStatus);

        const firstName = asString(customer?.firstName) ?? "";
        const lastName = asString(customer?.lastName) ?? "";
        const customerName = `${firstName} ${lastName}`.trim();

        return {
          id: item.id,
          confirmationCode: getFirstString(item, ["confirmationCode"]),
          status: displayStatus,
          rawStatus: itemStatus ?? null,
          paymentStatus: paymentStatus ?? null,
          creationDate:
            getFirstDateString(item, ["creationDate", "bookingCreationDate"]) ??
            getFirstDateString(firstProductBooking, ["creationDate", "bookingCreationDate"]) ??
            null,
          startDateTime: firstStartDateTime ?? startDateTimeFromAnyProduct ?? null,
          startDate: firstStartDate ?? startDateFromAnyProduct ?? null,
          productTitle:
            getFirstString(firstProductInfo, ["title"]) ??
            getFirstString(firstProductBooking, ["title", "productType"]) ??
            null,
          customerName: customerName.length > 0 ? customerName : null,
          customerEmail: getFirstString(customer, ["emailAddress", "email"]),
          productBookingsCount: productBookings.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items,
      totalHits: typeof payload.totalHits === "number" ? payload.totalHits : items.length,
      tookInMillis: typeof payload.tookInMillis === "number" ? payload.tookInMillis : 0,
    };
  },
});

export const getTelegramChannel = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("telegram_channels")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

/* ─── Operator Inbox ─── */

export const listActiveHandoffs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .order("desc")
      .collect();

    const active = conversations.filter((c) => c.handoffState === "active");

    const enriched = await Promise.all(
      active.map(async (conv) => {
        const lastMsg = await ctx.db
          .query("chat_messages")
          .withIndex("by_tenantId_waUserId", (q) =>
            q.eq("tenantId", args.tenantId).eq("waUserId", conv.waUserId),
          )
          .order("desc")
          .first();
        return {
          _id: conv._id,
          waUserId: conv.waUserId,
          handoffChannel: conv.handoffChannel ?? "wa",
          updatedAt: conv.updatedAt,
          lastMessage: lastMsg
            ? {
                content:
                  lastMsg.content.length > 80
                    ? lastMsg.content.slice(0, 80) + "..."
                    : lastMsg.content,
                role: lastMsg.role,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );
    return enriched;
  },
});

export const countActiveHandoffs = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId),
      )
      .collect();
    return conversations.filter((c) => c.handoffState === "active").length;
  },
});

export const getChatHistory = query({
  args: {
    tenantId: v.id("tenants"),
    waUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTenantMembership(ctx, args.tenantId);
    return ctx.db
      .query("chat_messages")
      .withIndex("by_tenantId_waUserId", (q) =>
        q.eq("tenantId", args.tenantId).eq("waUserId", args.waUserId),
      )
      .order("desc")
      .take(args.limit ?? 50);
  },
});
