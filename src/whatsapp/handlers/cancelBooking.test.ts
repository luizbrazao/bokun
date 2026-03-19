import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCancelIntent, handleCancelBooking } from "./cancelBooking.ts";

// Mock the Convex client and Bokun gateway to avoid real network calls
vi.mock("../../convex/client.ts", () => ({
  getConvexClient: vi.fn(),
}));

vi.mock("../../bokun/gateway.ts", () => ({
  bokunCancelBookingForTenant: vi.fn(),
  bokunGetBookingForTenant: vi.fn(),
}));

// Mock the logger to silence output in tests
vi.mock("../../lib/logger.ts", () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import { getConvexClient } from "../../convex/client.ts";
import { bokunCancelBookingForTenant, bokunGetBookingForTenant } from "../../bokun/gateway.ts";

describe("isCancelIntent", () => {
  it('returns true for "cancelar"', () => {
    expect(isCancelIntent("cancelar")).toBe(true);
  });

  it('returns true for "CANCELAR" (case insensitive)', () => {
    expect(isCancelIntent("CANCELAR")).toBe(true);
  });

  it('returns true for "cancelar reserva"', () => {
    expect(isCancelIntent("cancelar reserva")).toBe(true);
  });

  it('returns true for "cancel booking"', () => {
    expect(isCancelIntent("cancel booking")).toBe(true);
  });

  it('returns true when text starts with "cancelar " (keyword + space)', () => {
    expect(isCancelIntent("cancelar agora por favor")).toBe(true);
  });

  it('returns true for "quero cancelar"', () => {
    expect(isCancelIntent("quero cancelar")).toBe(true);
  });

  it('returns false for "booking" (no cancel keyword)', () => {
    expect(isCancelIntent("booking")).toBe(false);
  });

  it("returns true for english and spanish cancellation intents", () => {
    expect(isCancelIntent("I need to cancel my booking")).toBe(true);
    expect(isCancelIntent("Necesito cancelar mi reserva")).toBe(true);
  });

  it("returns false for negated cancellation intent", () => {
    expect(isCancelIntent("não quero cancelar")).toBe(false);
    expect(isCancelIntent("I do not want to cancel")).toBe(false);
  });
});

describe("handleCancelBooking", () => {
  const TENANT_ID = "tenant-123";
  const WA_USER_ID = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for confirmation code when no confirmed draft exists and no code in message", async () => {
    const mockConvex = {
      query: vi.fn().mockResolvedValue(null),
      mutation: vi.fn().mockResolvedValue(undefined),
    };
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);

    const result = await handleCancelBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "cancelar",
    });

    expect(result.handled).toBe(true);
    // Default language is "en" — expects English cancel code prompt
    expect(result.text).toContain("confirmation code");
  });

  it("cancels booking and returns success text containing confirmation code when draft is confirmed", async () => {
    const confirmedDraft = {
      _id: "draft-id-1",
      status: "confirmed",
      bokunConfirmationCode: "CONF-ABC123",
    };
    const mockConvex = {
      query: vi.fn().mockResolvedValue(confirmedDraft),
      mutation: vi.fn().mockResolvedValue(undefined),
    };
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (bokunGetBookingForTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      confirmationCode: "CONF-ABC123",
    });
    (bokunCancelBookingForTenant as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await handleCancelBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "cancelar",
    });

    expect(bokunCancelBookingForTenant).toHaveBeenCalledWith(
      expect.objectContaining({ confirmationCode: "CONF-ABC123" })
    );
    expect(result.handled).toBe(true);
    expect(result.text).toContain("CONF-ABC123");
  });

  it("cancels booking by explicit confirmation code even without confirmed draft", async () => {
    const mockConvex = {
      query: vi.fn().mockResolvedValue(null),
      mutation: vi.fn().mockResolvedValue(undefined),
    };
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (bokunGetBookingForTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      confirmationCode: "ABCD-1234",
    });
    (bokunCancelBookingForTenant as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await handleCancelBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "quero cancelar ABCD-1234",
    });

    expect(bokunCancelBookingForTenant).toHaveBeenCalledWith(
      expect.objectContaining({ confirmationCode: "ABCD-1234" })
    );
    expect(result.handled).toBe(true);
    expect(result.text).toContain("ABCD-1234");
  });

  it("returns graceful error text when Bokun cancel throws", async () => {
    const confirmedDraft = {
      _id: "draft-id-2",
      status: "confirmed",
      bokunConfirmationCode: "CONF-ERR999",
    };
    const mockConvex = {
      query: vi.fn().mockResolvedValue(confirmedDraft),
      mutation: vi.fn().mockResolvedValue(undefined),
    };
    (getConvexClient as ReturnType<typeof vi.fn>).mockReturnValue(mockConvex);
    (bokunGetBookingForTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      confirmationCode: "CONF-ERR999",
    });
    (bokunCancelBookingForTenant as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Bokun API error")
    );

    const result = await handleCancelBooking({
      tenantId: TENANT_ID,
      waUserId: WA_USER_ID,
      text: "cancelar",
    });

    expect(result.handled).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
    // Should be an error message, not a success message
    expect(result.text).not.toContain("cancelada com sucesso");
  });
});
