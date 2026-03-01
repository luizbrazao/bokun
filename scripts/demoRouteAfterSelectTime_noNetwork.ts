import { hasBookingDraftForPickup } from "../src/whatsapp/handlers/routeAfterSelectTime.ts";

console.log("Demo no-network: hasBookingDraftForPickup");
console.log(
  JSON.stringify(
    {
      input: { activityId: "act-1", date: "2026-02-16" },
      hasBookingDraftForPickup: hasBookingDraftForPickup({
        activityId: "act-1",
        date: "2026-02-16",
      }),
    },
    null,
    2
  )
);
console.log(
  JSON.stringify(
    {
      input: { activityId: "act-1", date: "2026-02-16", startTimeId: "st-08" },
      hasBookingDraftForPickup: hasBookingDraftForPickup({
        activityId: "act-1",
        date: "2026-02-16",
        startTimeId: "st-08",
      }),
    },
    null,
    2
  )
);
console.log(
  JSON.stringify(
    {
      input: { activityId: "act-1", date: "16/02/2026", startTimeId: "st-08" },
      hasBookingDraftForPickup: hasBookingDraftForPickup({
        activityId: "act-1",
        date: "16/02/2026",
        startTimeId: "st-08",
      }),
    },
    null,
    2
  )
);
