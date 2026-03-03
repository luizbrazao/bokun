import {
  orchestrateBooking,
  type OrchestrateBookingArgs,
  type OrchestrateBookingResult,
} from "./handlers/orchestrateBooking.ts";
import { runLLMAgent } from "../llm/agent.ts";
import { getConvexClient } from "../convex/client.ts";
import {
  isHandoffIntent,
  handleStartHandoff,
  handleHandoffUserMessage,
} from "./handlers/handoff.ts";

export type RouteWhatsAppMessageArgs = OrchestrateBookingArgs & {
  channel?: "wa" | "tg";
};

export type RouteWhatsAppMessageResult = OrchestrateBookingResult;

type ConversationHandoff = {
  handoffState?: string;
} | null;

export async function routeWhatsAppMessage(
  args: RouteWhatsAppMessageArgs
): Promise<RouteWhatsAppMessageResult> {
  const channel = args.channel ?? "wa";
  const convex = getConvexClient();

  // -1. Check if bot is enabled for this tenant
  const tenant = await convex.query(
    "tenants:getTenantById" as any,
    { tenantId: args.tenantId } as any
  ) as { status: string } | null;
  if (tenant?.status === "disabled") {
    return {
      handled: true,
      text: "O bot está temporariamente desativado. Por favor, contacte o operador para mais informações.",
    };
  }

  // 0. Check if conversation is in active handoff
  const conversation = (await convex.query(
    "conversations:getConversationByWaUserId" as any,
    { tenantId: args.tenantId, waUserId: args.waUserId } as any
  )) as ConversationHandoff;

  if (conversation?.handoffState === "active") {
    // Forward user messages to operator group
    return handleHandoffUserMessage({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      channel,
    });
  }

  // 0.5. Check for explicit handoff intent
  if (isHandoffIntent(args.text)) {
    return handleStartHandoff({
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      text: args.text,
      channel,
    });
  }

  // 1. Try deterministic booking state machine first
  const bookingResult = await orchestrateBooking(args);
  if (bookingResult.handled) {
    return bookingResult;
  }

  // 2. Fallback to LLM agent for unhandled messages
  return runLLMAgent({
    tenantId: args.tenantId,
    waUserId: args.waUserId,
    userMessage: args.text,
  });
}
