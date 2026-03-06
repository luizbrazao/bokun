import { bokunGetActivityByIdForTenant, bokunGetPickupPlacesForTenant } from "../../bokun/gateway.ts";
import { getConvexClient } from "../../convex/client.ts";
import { formatPickupPlaces } from "../formatPickupPlaces.ts";
import rootLogger from "../../lib/logger.ts";
import { captureError } from "../../lib/sentry.ts";
import type { SupportedLanguage } from "../../i18n.ts";
import { byLanguage } from "../../i18n.ts";

type HandleListPickupPlacesArgs = {
  tenantId: string;
  waUserId: string;
  language?: SupportedLanguage;
};

type HandleListPickupPlacesResult = {
  text: string;
  pickupOptionMap: Array<{ index: number; pickupPlaceId?: string | number }>;
};

type BookingDraft = {
  _id: string;
  activityId?: string;
  date?: string;
} | null;

function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asIdOrUndefined(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
}

function mapPickupPlaces(raw: unknown): Array<{ title: string; address?: string; id?: string | number }> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const obj = item as Record<string, unknown>;
      const title = asStringOrUndefined(obj.title) ?? asStringOrUndefined(obj.name);
      if (!title) {
        return null;
      }

      const address = asStringOrUndefined(obj.address);
      const id = asIdOrUndefined(obj.id);
      return { title, address, id };
    })
    .filter((item): item is { title: string; address?: string; id?: string | number } => item !== null);
}

function extractActivityTitle(activity: unknown): string | undefined {
  if (!activity || typeof activity !== "object") {
    return undefined;
  }

  const obj = activity as Record<string, unknown>;
  return asStringOrUndefined(obj.title) ?? asStringOrUndefined(obj.name);
}

export async function handleListPickupPlaces(
  args: HandleListPickupPlacesArgs
): Promise<HandleListPickupPlacesResult> {
  const convex = getConvexClient();
  const draft = (await convex.query(
    "bookingDrafts:getBookingDraftByWaUserId" as any,
    { tenantId: args.tenantId, waUserId: args.waUserId } as any
  )) as BookingDraft;

  if (!draft?.activityId || !draft.date) {
    return {
      text: byLanguage(args.language, {
        pt: "Antes de escolher pickup, preciso que você selecione atividade, data e horário.",
        en: "Before choosing pickup, you need to select activity, date, and time.",
        es: "Antes de elegir pickup, necesitas seleccionar actividad, fecha y horario.",
      }),
      pickupOptionMap: [],
    };
  }

  let activityDetails: unknown;
  let pickupPlaces: unknown;

  try {
    [activityDetails, pickupPlaces] = await Promise.all([
      bokunGetActivityByIdForTenant({
        tenantId: args.tenantId,
        id: draft.activityId,
      }),
      bokunGetPickupPlacesForTenant({
        tenantId: args.tenantId,
        id: draft.activityId,
      }),
    ]);
  } catch (error) {
    rootLogger.error({ tenantId: args.tenantId, waUserId: args.waUserId, handler: "listPickupPlaces" }, "bokun_api_error");
    captureError(error, { tenantId: args.tenantId, handler: "listPickupPlaces" });
    return {
      text: byLanguage(args.language, {
        pt: "Erro ao consultar locais de pickup. Tente novamente em alguns instantes.",
        en: "Error while fetching pickup locations. Please try again in a few moments.",
        es: "Error al consultar puntos de pickup. Inténtalo de nuevo en unos instantes.",
      }),
      pickupOptionMap: [],
    };
  }

  const formatted = formatPickupPlaces({
    activityTitle: extractActivityTitle(activityDetails),
    language: args.language,
    options: mapPickupPlaces(pickupPlaces),
  });

  await convex.mutation(
    "bookingDrafts:setLastPickupOptionMap" as any,
    {
      bookingDraftId: draft._id,
      optionMap: formatted.pickupOptionMap,
    } as any
  );

  return formatted;
}
