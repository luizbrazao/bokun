import {
  buildGetActivityByIdRequest,
  buildSearchActivitiesRequest,
} from "../src/bokun/activities.ts";
import { assertBokunEndpointAllowed } from "../src/bokun/allowlist.ts";

const demoBaseUrl = "<BASE_URL_FORNECIDA_PELO_CHAMADOR>";

const searchRequest = buildSearchActivitiesRequest({
  baseUrl: demoBaseUrl,
  headers: {
    Authorization: "Bearer <token>",
  },
  body: {
    page: 1,
    pageSize: 10,
    text: "snorkel",
  },
});

const getByIdRequest = buildGetActivityByIdRequest({
  baseUrl: demoBaseUrl,
  id: 123,
  headers: {
    Authorization: "Bearer <token>",
  },
});

assertBokunEndpointAllowed(searchRequest.method, searchRequest.path);
assertBokunEndpointAllowed(getByIdRequest.method, getByIdRequest.path);

console.log("Demo request payloads (no network call):");
console.log(JSON.stringify(searchRequest, null, 2));
console.log(JSON.stringify(getByIdRequest, null, 2));
console.log("Allowlist validation passed for activities endpoints.");
