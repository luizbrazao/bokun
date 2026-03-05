import { bokunRequest, type BokunRequestOptions } from "./client.ts";

// Low-level Bokun calls. Application code should use src/bokun/gateway.ts.
export type BokunAuthHeaders = Record<string, string>;

export type SearchActivitiesArgs = {
  baseUrl: string;
  headers?: BokunAuthHeaders;
  body?: Record<string, unknown>;
  lang?: string;
  currency?: string;
};

export type GetActivityByIdArgs = {
  baseUrl: string;
  id: string | number;
  headers?: BokunAuthHeaders;
};

export type BokunActivitySearchResponse = {
  items?: unknown[];
  total?: number;
  [key: string]: unknown;
};

export type BokunActivityDetailsResponse = {
  id?: string | number;
  title?: string;
  [key: string]: unknown;
};

export function buildSearchActivitiesRequest(args: SearchActivitiesArgs): BokunRequestOptions {
  const query = new URLSearchParams();
  if (args.lang) {
    query.set("lang", args.lang);
  }
  if (args.currency) {
    query.set("currency", args.currency);
  }

  const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";

  return {
    method: "POST",
    baseUrl: args.baseUrl,
    path: `/activity.json/search${suffix}`,
    headers: args.headers,
    body: args.body ?? { page: 1, pageSize: 20 },
  };
}

export function buildGetActivityByIdRequest(args: GetActivityByIdArgs): BokunRequestOptions {
  return {
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/activity.json/${encodeURIComponent(String(args.id))}`,
    headers: args.headers,
  };
}

export async function searchActivities(args: SearchActivitiesArgs): Promise<BokunActivitySearchResponse> {
  return bokunRequest<BokunActivitySearchResponse>(buildSearchActivitiesRequest(args));
}

export async function getActivityById(args: GetActivityByIdArgs): Promise<BokunActivityDetailsResponse> {
  return bokunRequest<BokunActivityDetailsResponse>(buildGetActivityByIdRequest(args));
}
