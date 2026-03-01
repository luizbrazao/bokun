import { processWebhookWithDedup } from "../src/server.ts";

const claimedKeys = new Set<string>();
let flowCalls = 0;

const claimDedup = async (args: { tenantId: string; key: string }): Promise<boolean> => {
  const compound = `${args.tenantId}:${args.key}`;
  if (claimedKeys.has(compound)) {
    return false;
  }
  claimedKeys.add(compound);
  return true;
};

const runBookingFlow = async () => {
  flowCalls += 1;
  return { handled: true };
};

const payload = {
  tenantId: "TENANT_ID_EXEMPLO",
  waUserId: "WA_USER_123",
  text: "2",
  messageId: "wamid.example.12345",
};

const first = await processWebhookWithDedup(
  {
    tenantId: payload.tenantId,
    waUserId: payload.waUserId,
    text: payload.text,
    body: payload,
  },
  {
    claimDedup,
    runBookingFlow,
  }
);

const second = await processWebhookWithDedup(
  {
    tenantId: payload.tenantId,
    waUserId: payload.waUserId,
    text: payload.text,
    body: payload,
  },
  {
    claimDedup,
    runBookingFlow,
  }
);

if (first.duplicate || !first.handled) {
  throw new Error("Primeira chamada deveria processar normalmente.");
}

if (!second.duplicate) {
  throw new Error("Segunda chamada deveria ser marcada como duplicada.");
}

if (flowCalls !== 1) {
  throw new Error(`Fluxo deveria executar uma vez. Execuções observadas: ${flowCalls}`);
}

console.log("ok");
