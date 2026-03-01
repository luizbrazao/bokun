import { assertBokunEndpointAllowed } from "../src/bokun/allowlist.ts";
import { buildGetAvailabilitiesRequest } from "../src/bokun/availabilities.ts";
import { buildGetPickupPlacesRequest } from "../src/bokun/pickupPlaces.ts";

const fakeContext = {
  baseUrl: "<BASE_URL_FORNECIDA_PELO_CONVEX>",
  headers: {
    Authorization: "Bearer <token>",
  },
};

const availabilitiesPayload = buildGetAvailabilitiesRequest({
  baseUrl: fakeContext.baseUrl,
  headers: fakeContext.headers,
  id: 123,
  start: "2026-02-16",
  end: "2026-02-28",
  currency: "USD",
});

const pickupPlacesPayload = buildGetPickupPlacesRequest({
  baseUrl: fakeContext.baseUrl,
  headers: fakeContext.headers,
  id: 123,
});

assertBokunEndpointAllowed(availabilitiesPayload.method, availabilitiesPayload.path);
assertBokunEndpointAllowed(pickupPlacesPayload.method, pickupPlacesPayload.path);

console.log("Availability/Pickup payload demo (no external calls):");
console.log(JSON.stringify(availabilitiesPayload, null, 2));
console.log(JSON.stringify(pickupPlacesPayload, null, 2));
console.log("Allowlist ok");
