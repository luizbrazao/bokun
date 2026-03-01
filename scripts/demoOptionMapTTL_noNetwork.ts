import { isOptionMapExpired as isTimeOptionMapExpired } from "../src/whatsapp/handlers/selectTime.ts";
import { isOptionMapExpired as isPickupOptionMapExpired } from "../src/whatsapp/handlers/selectPickupPlace.ts";

const nowMs = Date.now();
const ttlMs = 15 * 60_000;
const freshUpdatedAt = nowMs - 5 * 60_000;
const staleUpdatedAt = nowMs - 20 * 60_000;
const conversationTimestamps = {
  lastOptionMapUpdatedAt: freshUpdatedAt,
  lastPickupOptionMapUpdatedAt: staleUpdatedAt,
};

console.log("Demo no-network: optionMap TTL");
console.log(
  JSON.stringify(
    {
      module: "selectTime",
      fresh: isTimeOptionMapExpired(freshUpdatedAt, nowMs, ttlMs),
      stale: isTimeOptionMapExpired(staleUpdatedAt, nowMs, ttlMs),
      invalidUpdatedAt: isTimeOptionMapExpired(undefined, nowMs, ttlMs),
      mixedConversationSample: isTimeOptionMapExpired(
        conversationTimestamps.lastOptionMapUpdatedAt,
        nowMs,
        ttlMs
      ),
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      module: "selectPickupPlace",
      fresh: isPickupOptionMapExpired(freshUpdatedAt, nowMs, ttlMs),
      stale: isPickupOptionMapExpired(staleUpdatedAt, nowMs, ttlMs),
      invalidUpdatedAt: isPickupOptionMapExpired("not-a-number", nowMs, ttlMs),
      mixedConversationSample: isPickupOptionMapExpired(
        conversationTimestamps.lastPickupOptionMapUpdatedAt,
        nowMs,
        ttlMs
      ),
    },
    null,
    2
  )
);
