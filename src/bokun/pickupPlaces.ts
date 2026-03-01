import { bokunRequest, type BokunRequestOptions } from "./client.ts";

export type BokunAuthHeaders = Record<string, string>;

export type GetPickupPlacesArgs = {
  baseUrl: string;
  id: string | number;
  headers?: BokunAuthHeaders;
};

export type BokunPickupPlace = {
  id?: string | number;
  title?: string;
  address?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type BokunPickupPlacesResponse = BokunPickupPlace[];

export function buildGetPickupPlacesRequest(args: GetPickupPlacesArgs): BokunRequestOptions {
  return {
    method: "GET",
    baseUrl: args.baseUrl,
    path: `/activity.json/${encodeURIComponent(String(args.id))}/pickup-places`,
    headers: args.headers,
  };
}

export async function getPickupPlaces(args: GetPickupPlacesArgs): Promise<BokunPickupPlacesResponse> {
  return bokunRequest<BokunPickupPlacesResponse>(buildGetPickupPlacesRequest(args));
}
