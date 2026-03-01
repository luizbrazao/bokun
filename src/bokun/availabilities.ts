import { bokunRequest, type BokunRequestOptions } from "./client.ts";

export type BokunAuthHeaders = Record<string, string>;

export type GetAvailabilitiesArgs = {
  baseUrl: string;
  id: string | number;
  start: string;
  end: string;
  currency?: string;
  lang?: string;
  headers?: BokunAuthHeaders;
};

export type BokunAvailability = {
  date?: string;
  startTimeId?: string | number;
  available?: boolean;
  price?: {
    amount?: number;
    currency?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type BokunAvailabilitiesResponse = BokunAvailability[];

function extractAvailabilitiesPayload(raw: unknown): BokunAvailabilitiesResponse {
  if (Array.isArray(raw)) {
    return raw as BokunAvailabilitiesResponse;
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const record = raw as Record<string, unknown>;
  const candidates = [
    record.items,
    record.availabilities,
    record.results,
    (record.data as Record<string, unknown> | undefined)?.items,
    (record.data as Record<string, unknown> | undefined)?.availabilities,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as BokunAvailabilitiesResponse;
    }
  }

  return [];
}

export function buildGetAvailabilitiesRequest(args: GetAvailabilitiesArgs): BokunRequestOptions {
  const query = new URLSearchParams({
    start: args.start,
    end: args.end,
  });

  if (args.currency) {
    query.set("currency", args.currency);
  }
  if (args.lang) {
    query.set("lang", args.lang);
  }

  return {
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/activity.json/${encodeURIComponent(String(args.id))}/availabilities?${query.toString()}`,
    headers: args.headers,
  };
}

export async function getAvailabilities(args: GetAvailabilitiesArgs): Promise<BokunAvailabilitiesResponse> {
  const raw = await bokunRequest<unknown>(buildGetAvailabilitiesRequest(args));
  return extractAvailabilitiesPayload(raw);
}
