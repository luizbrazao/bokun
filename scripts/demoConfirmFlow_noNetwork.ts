import { handleAfterConfirmWithDeps } from "../src/whatsapp/handlers/afterConfirm.ts";

const calls = {
  confirm: 0,
  abandon: 0,
  createBooking: 0,
};

const mockDraft = {
  _id: "BOOKING_DRAFT_123",
  activityId: "1001",
  selectedDateKey: "2026-02-16",
  selectedStartTimeId: 999,
  participants: 2,
};

const deps = {
  getDraft: async () => mockDraft,
  confirmDraft: async () => {
    calls.confirm += 1;
  },
  abandonDraft: async () => {
    calls.abandon += 1;
  },
  createBookingFromDraft: async () => {
    calls.createBooking += 1;
    return {
      bokunBookingId: "BK-123",
      bokunConfirmationCode: "CONF-999",
    };
  },
};

const yes = await handleAfterConfirmWithDeps(
  {
    tenantId: "TENANT_ID_EXEMPLO",
    waUserId: "WA_USER_123",
    text: "sim",
  },
  deps
);

if (calls.confirm !== 1 || calls.createBooking !== 1 || calls.abandon !== 0) {
  throw new Error("Fluxo 'sim' não acionou confirm/create corretamente.");
}

const no = await handleAfterConfirmWithDeps(
  {
    tenantId: "TENANT_ID_EXEMPLO",
    waUserId: "WA_USER_123",
    text: "não",
  },
  deps
);

if (calls.abandon !== 1) {
  throw new Error("Fluxo 'não' não acionou abandono.");
}

console.log(yes.text);
console.log(no.text);
console.log("ok");
