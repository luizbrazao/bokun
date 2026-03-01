import { assertBokunEndpointAllowed } from "../src/bokun/allowlist.ts";
import { buildGetActivityByIdRequest, buildSearchActivitiesRequest } from "../src/bokun/activities.ts";
import type {
  bokunGetActivityByIdForTenant,
  bokunSearchActivitiesForTenant,
} from "../src/bokun/gateway.ts";

type GatewayContract = {
  search: typeof bokunSearchActivitiesForTenant;
  getById: typeof bokunGetActivityByIdForTenant;
};

const _gatewayContract: GatewayContract = {} as GatewayContract;
void _gatewayContract;

const fakeContext = {
  baseUrl: "<BASE_URL_FORNECIDA_PELO_CONVEX>",
  headers: {
    Authorization: "Bearer <token>",
  },
};

const searchPayload = buildSearchActivitiesRequest({
  baseUrl: fakeContext.baseUrl,
  headers: fakeContext.headers,
  body: {
    page: 1,
    pageSize: 20,
    text: "boat tour",
  },
});

const detailsPayload = buildGetActivityByIdRequest({
  baseUrl: fakeContext.baseUrl,
  headers: fakeContext.headers,
  id: 123,
});

assertBokunEndpointAllowed(searchPayload.method, searchPayload.path);
assertBokunEndpointAllowed(detailsPayload.method, detailsPayload.path);

console.log("Tenant gateway payload demo (no external calls):");
console.log(JSON.stringify(searchPayload, null, 2));
console.log(JSON.stringify(detailsPayload, null, 2));
console.log("Allowlist ok");
