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
import { getConvexServiceToken } from "../convex/client.ts";

export type RouteWhatsAppMessageArgs = OrchestrateBookingArgs & {
  channel?: "wa" | "tg";
};

export type RouteWhatsAppMessageResult = OrchestrateBookingResult;

type ConversationHandoff = {
  handoffState?: string;
} | null;

const GRACE_PERIOD_DAYS = 7;

/**
 * Returns true if the bot should be blocked for this tenant based on subscription status.
 * - null/undefined stripeStatus → NOT gated (allows pre-Stripe tenants to continue working)
 * - "active" / "trialing" → NOT gated
 * - "past_due" within GRACE_PERIOD_DAYS of stripeCurrentPeriodEnd → NOT gated (grace period)
 * - "past_due" beyond grace period → gated
 * - all other statuses ("canceled", "unpaid", "incomplete", "incomplete_expired", "paused") → gated
 */
export function isSubscriptionGated(
  stripeStatus: string | undefined | null,
  stripeCurrentPeriodEnd: number | undefined | null,
  nowMs?: number
): boolean {
  if (!stripeStatus) return false; // no subscription yet — allow (pre-billing tenants)
  if (stripeStatus === "active" || stripeStatus === "trialing") return false;
  if (stripeStatus === "past_due") {
    if (!stripeCurrentPeriodEnd) return true; // no period end known — block
    const now = nowMs ?? Date.now();
    const graceCutoffMs = stripeCurrentPeriodEnd * 1000 + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    return now > graceCutoffMs;
  }
  // "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused"
  return true;
}

export async function routeWhatsAppMessage(
  args: RouteWhatsAppMessageArgs
): Promise<RouteWhatsAppMessageResult> {
  const channel = args.channel ?? "wa";
  const convex = getConvexClient();
  const serviceToken = getConvexServiceToken();

  // -1. Check if bot is enabled for this tenant
  const tenant = await convex.query(
    "tenants:getTenantByIdForService" as any,
    { tenantId: args.tenantId, serviceToken } as any
  ) as { status: string; stripeStatus?: string; stripeCurrentPeriodEnd?: number } | null;
  if (tenant?.status === "disabled") {
    return {
      handled: true,
      text: "O bot está temporariamente desativado. Por favor, contacte o operador para mais informações.",
    };
  }

  // -0.5. Subscription gating (BILL-05)
  // Allowed: active, trialing
  // Grace period: past_due within 7 days of stripeCurrentPeriodEnd
  // Blocked: canceled, unpaid, incomplete, incomplete_expired, paused, and past_due beyond 7-day grace
  if (tenant) {
    const gated = isSubscriptionGated(tenant.stripeStatus, tenant.stripeCurrentPeriodEnd);
    if (gated) {
      return {
        handled: true,
        text: "O serviço de reservas está temporariamente indisponível. Por favor, acesse as configurações em /configuracoes → Assinatura para reativar a sua subscrição.",
      };
    }
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
