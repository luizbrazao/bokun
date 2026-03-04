import { describe, expect, it } from "vitest";
import { processWebhookWithDedup } from "./server.ts";

describe("processWebhookWithDedup", () => {
  it("uses explicit messageId to build dedup key", async () => {
    const seen = new Set<string>();
    const claimedKeys: string[] = [];

    const claimDedup = async ({ key }: { tenantId: string; key: string }) => {
      claimedKeys.push(key);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };

    const runBookingFlow = async () => ({
      handled: true,
    });

    const first = await processWebhookWithDedup(
      {
        tenantId: "tenant_1",
        waUserId: "5511999999999",
        text: "Oi",
        body: { entry: [{ changes: [{ value: { messages: [{ id: "msg_a" }, { id: "msg_b" }] } }] }] },
        messageId: "msg_a",
        channelPrefix: "wa",
      },
      { claimDedup, runBookingFlow }
    );

    const second = await processWebhookWithDedup(
      {
        tenantId: "tenant_1",
        waUserId: "5511999999999",
        text: "Tudo bem?",
        body: { entry: [{ changes: [{ value: { messages: [{ id: "msg_a" }, { id: "msg_b" }] } }] }] },
        messageId: "msg_b",
        channelPrefix: "wa",
      },
      { claimDedup, runBookingFlow }
    );

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(claimedKeys).toEqual(["wa:msg_a", "wa:msg_b"]);
  });
});
