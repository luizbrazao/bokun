// Use this in the webhook router when user is selecting a time.
import { handleListPickupPlaces } from "./listPickupPlaces.ts";
import { handleSelectTime } from "./selectTime.ts";
import { getConvexClient } from "../../convex/client.ts";

export type HandleAfterSelectTimeArgs = {
  tenantId: string;
  waUserId: string;
  text: string;
};

export type HandleAfterSelectTimeResult = {
  text: string;
};

type BookingDraftRef = {
  _id: string;
} | null;

export async function handleAfterSelectTime(
  args: HandleAfterSelectTimeArgs
): Promise<HandleAfterSelectTimeResult> {
  const selected = await handleSelectTime({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
    text: args.text,
  });

  if (!selected.ok) {
    return {
      text: selected.text,
    };
  }

  if (selected.next === "check_pickup") {
    const pickup = await handleListPickupPlaces({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
    });

    return {
      text: [selected.text, pickup.text].join("\n\n"),
    };
  }

  if (selected.next === "skip_pickup") {
    try {
      const convex = getConvexClient();
      const draft = (await convex.query(
        "bookingDrafts:getBookingDraftByWaUserId" as any,
        {
          tenantId: args.tenantId,
          waUserId: args.waUserId,
        } as any
      )) as BookingDraftRef;

      if (draft?._id) {
        await convex.mutation(
          "bookingDrafts:setNextStep" as any,
          {
            bookingDraftId: draft._id,
            nextStep: "ask_participants",
          } as any
        );
      }
    } catch {
      // Fallback defensivo: segue o fluxo sem bloquear resposta ao usuário.
    }

    return {
      text: [selected.text, "Quantas pessoas vão participar? (ex: 2)"].join("\n\n"),
    };
  }

  return {
    text: selected.text,
  };
}
