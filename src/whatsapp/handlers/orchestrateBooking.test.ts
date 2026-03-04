import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock all external dependencies before importing the module under test
vi.mock("../../convex/client.ts", () => ({
  getConvexClient: vi.fn(),
}));

vi.mock("./listTimes.ts", () => ({
  handleListTimes: vi.fn(),
}));

vi.mock("./afterSelectTime.ts", () => ({
  handleAfterSelectTime: vi.fn(),
}));

vi.mock("./afterSelectPickup.ts", () => ({
  handleAfterSelectPickup: vi.fn(),
}));

vi.mock("./afterAskParticipants.ts", () => ({
  handleAfterAskParticipants: vi.fn(),
}));

vi.mock("./afterConfirm.ts", () => ({
  handleAfterConfirm: vi.fn(),
  parseConfirmationIntent: vi.fn(),
}));

vi.mock("./cancelBooking.ts", () => ({
  isCancelIntent: vi.fn(),
  handleCancelBooking: vi.fn(),
}));

vi.mock("./editBooking.ts", () => ({
  isEditIntent: vi.fn().mockReturnValue(false),
  handleEditBooking: vi.fn(),
}));

// Mock dynamic imports used inside orchestrateBooking
vi.mock("./askBookingQuestions.ts", () => ({
  askBookingQuestions: vi.fn(),
}));

vi.mock("./collectBookingAnswers.ts", () => ({
  collectBookingAnswers: vi.fn(),
}));

import { orchestrateBooking } from "./orchestrateBooking.ts";
import { getConvexClient } from "../../convex/client.ts";
import { handleListTimes } from "./listTimes.ts";
import { handleAfterSelectTime } from "./afterSelectTime.ts";
import { handleAfterSelectPickup } from "./afterSelectPickup.ts";
import { handleAfterAskParticipants } from "./afterAskParticipants.ts";
import { handleAfterConfirm } from "./afterConfirm.ts";
import { isCancelIntent, handleCancelBooking } from "./cancelBooking.ts";
import { isEditIntent } from "./editBooking.ts";

// Helper to create a mock Convex client
function makeMockConvex(draft: unknown, conversation: unknown = null) {
  return {
    query: vi.fn().mockImplementation((name: string) => {
      if (name.includes("getBookingDraftByWaUserId")) return Promise.resolve(draft);
      if (name.includes("getConversationByWaUserId")) return Promise.resolve(conversation);
      return Promise.resolve(null);
    }),
    mutation: vi.fn().mockResolvedValue(undefined),
  };
}

const TENANT_ID = "tenant-abc";
const WA_USER_ID = "user-xyz";

describe("orchestrateBooking — no draft (date parsing + listTimes path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // editBooking always returns false by default
    (isEditIntent as ReturnType<typeof vi.fn>).mockReturnValue(false);
    // cancel intent returns false by default
    (isCancelIntent as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("calls handleListTimes when text has a date (DD/MM) and conversation has lastActivityId", async () => {
    const conversation = { lastActivityId: "456" };
    const mockConvex = makeMockConvex(null, conversation);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (handleListTimes as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Aqui estao os horarios disponíveis!",
      handled: true,
    });

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "quero reservar para 25/06",
    });

    expect(handleListTimes).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: "456", date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/) })
    );
    expect(result.handled).toBe(true);
    expect(result.text).toBeTruthy();
  });

  it("returns handled: false when text has no parseable date", async () => {
    const mockConvex = makeMockConvex(null, { lastActivityId: "456" });
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "olá",
    });

    expect(result.handled).toBe(false);
    expect(handleListTimes).not.toHaveBeenCalled();
  });

  it("returns handled: false when date is present but conversation has no lastActivityId", async () => {
    const conversation = { lastActivityId: "" }; // empty activityId
    const mockConvex = makeMockConvex(null, conversation);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "2025-07-01",
    });

    expect(result.handled).toBe(false);
    expect(handleListTimes).not.toHaveBeenCalled();
  });
});

describe("orchestrateBooking — state machine routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isCancelIntent as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isEditIntent as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("routes nextStep: select_time to handleAfterSelectTime", async () => {
    const draft = { _id: "draft-1", nextStep: "select_time" };
    const mockConvex = makeMockConvex(draft);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (handleAfterSelectTime as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Por favor escolha um horário.",
      handled: true,
    });

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "1",
    });

    expect(handleAfterSelectTime).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, waUserId: WA_USER_ID, text: "1" })
    );
    expect(result.handled).toBe(true);
  });

  it("routes nextStep: select_pickup to handleAfterSelectPickup", async () => {
    const draft = { _id: "draft-pickup", nextStep: "select_pickup" };
    const mockConvex = makeMockConvex(draft);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (handleAfterSelectPickup as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Selecione um local de pickup.",
      handled: true,
    });

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "1",
    });

    expect(handleAfterSelectPickup).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, waUserId: WA_USER_ID, text: "1" })
    );
    expect(result.handled).toBe(true);
  });

  it("routes nextStep: ask_participants to handleAfterAskParticipants", async () => {
    const draft = { _id: "draft-2", nextStep: "ask_participants" };
    const mockConvex = makeMockConvex(draft);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (handleAfterAskParticipants as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Quantos participantes?",
      handled: true,
    });

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "2",
    });

    expect(handleAfterAskParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, waUserId: WA_USER_ID, text: "2" })
    );
    expect(result.handled).toBe(true);
  });

  it("routes nextStep: confirm to handleAfterConfirm", async () => {
    const draft = { _id: "draft-3", nextStep: "confirm" };
    const mockConvex = makeMockConvex(draft);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (handleAfterConfirm as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Reserva confirmada!",
      handled: true,
    });

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "sim",
    });

    expect(handleAfterConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, waUserId: WA_USER_ID, text: "sim" })
    );
    expect(result.handled).toBe(true);
    expect(result.text).toContain("confirmada");
  });
});

describe("orchestrateBooking — cancellation flow (TEST-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isEditIntent as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("calls handleCancelBooking when isCancelIntent returns true", async () => {
    (isCancelIntent as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (handleCancelBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Reserva cancelada com sucesso.",
      handled: true,
    });

    // Convex mock not needed since cancel intercepts before draft lookup
    const mockConvex = makeMockConvex(null);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "cancelar",
    });

    expect(handleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, waUserId: WA_USER_ID, text: "cancelar" })
    );
    expect(result.handled).toBe(true);
  });

  it("returns 'Não encontrei' text when isCancelIntent true but no confirmed draft", async () => {
    (isCancelIntent as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (handleCancelBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Não encontrei uma reserva confirmada para cancelar.",
      handled: true,
    });

    const mockConvex = makeMockConvex(null);
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const result = await orchestrateBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "cancelar",
    });

    expect(result.handled).toBe(true);
    expect(result.text).toContain("Não encontrei");
  });
});