import {
  availabilityToOptionMap,
  type BokunAvailability,
} from "../../bokun/availabilityToOptionMap.ts";
import { parseAvailabilityDateToYMD } from "../../bokun/availabilityNormalizer.ts";
import {
  bokunGetActivityByIdForTenant,
  bokunGetAvailabilitiesForTenant,
} from "../../bokun/gateway.ts";
import { getConvexClient, getConvexServiceToken } from "../../convex/client.ts";
import { formatAvailabilityOptions } from "../formatAvailabilityOptions.ts";
import rootLogger from "../../lib/logger.ts";
import { captureError } from "../../lib/sentry.ts";

export type HandleListTimesArgs = {
  tenantId: string;
  waUserId: string;
  activityId: string | number;
  date: string;
  endDate?: string;
  currency?: string;
};

type HandleListTimesResult = {
  text: string;
  optionMap: Array<{ index: number; startTimeId?: string | number }>;
};

function extractActivityTitle(activity: unknown): string | undefined {
  if (!activity || typeof activity !== "object") {
    return undefined;
  }

  const maybeTitle = (activity as { title?: unknown }).title;
  if (typeof maybeTitle === "string" && maybeTitle.trim().length > 0) {
    return maybeTitle;
  }

  const maybeName = (activity as { name?: unknown }).name;
  if (typeof maybeName === "string" && maybeName.trim().length > 0) {
    return maybeName;
  }

  return undefined;
}

export async function handleListTimes(args: HandleListTimesArgs): Promise<HandleListTimesResult> {
  const activityIdNumber = typeof args.activityId === "number" ? args.activityId : Number(args.activityId);
  if (!Number.isFinite(activityIdNumber)) {
    throw new Error("activityId must be numeric to generate time_options_v1 OptionMap.");
  }

  let activityDetails: unknown;
  let availabilities: unknown;

  try {
    [activityDetails, availabilities] = await Promise.all([
      bokunGetActivityByIdForTenant({
        tenantId: args.tenantId,
        id: args.activityId,
      }),
      bokunGetAvailabilitiesForTenant({
        tenantId: args.tenantId,
        id: args.activityId,
        start: args.date,
        end: args.endDate ?? args.date,
        currency: args.currency,
      }),
    ]);
  } catch (error) {
    rootLogger.error({ tenantId: args.tenantId, waUserId: args.waUserId, handler: "listTimes" }, "bokun_api_error");
    captureError(error, { tenantId: args.tenantId, handler: "listTimes" });
    throw error; // re-throw so orchestrateBooking can handle gracefully
  }

  const rawItems = (Array.isArray(availabilities) ? availabilities : []) as Array<Record<string, unknown>>;
  const filteredByRequestedDate = rawItems.filter(
    (item) => parseAvailabilityDateToYMD(item) === args.date
  ) as BokunAvailability[];

  // Look up tenant timezone for availability formatting (PROF-02)
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();
  const tenantRecord = (await convex.query(
    "tenants:getTenantByIdForService" as any,
    { tenantId: args.tenantId, serviceToken } as any
  )) as { timezone?: string } | null;
  const tenantTimezone = tenantRecord?.timezone ?? "Europe/Madrid";

  const generatedOptionMap = availabilityToOptionMap({
    activityId: activityIdNumber,
    availabilities: filteredByRequestedDate,
    limit: 8,
    tz: tenantTimezone, // use tenant's configured timezone instead of hardcoded default
  });
  const bookingDraftId = await convex.mutation(
    "bookingDrafts:upsertBookingDraftBase" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      activityId: String(args.activityId),
      date: args.date,
    } as any
  );
  await convex.mutation(
    "bookingDrafts:setLastOptionMap" as any,
    {
      bookingDraftId,
      optionMap: generatedOptionMap,
    } as any
  );
  const formatted = formatAvailabilityOptions({
    activityTitle: extractActivityTitle(activityDetails),
    date: args.date,
    options: generatedOptionMap.options.map((option) => ({
      label: option.display,
      startTimeId: option.startTimeId,
    })),
  });
  await convex.mutation(
    "conversations:upsertConversationOptionMap" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      activityId: String(args.activityId),
      date: args.date,
      optionMap: formatted.optionMap,
    } as any
  );

  return formatted;
}
