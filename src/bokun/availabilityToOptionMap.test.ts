import { describe, it, expect } from "vitest";
import {
  availabilityToOptionMap,
  type BokunAvailability,
} from "./availabilityToOptionMap.ts";

// Helper to build a minimal BokunAvailability
function makeAvailability(overrides: Partial<BokunAvailability> = {}): BokunAvailability {
  return {
    id: "avail-1",
    activityId: 123,
    startTime: "10:00",
    startTimeId: 1001,
    date: new Date("2025-06-15T00:00:00.000Z").getTime(),
    availabilityCount: 5,
    minParticipants: 1,
    ...overrides,
  };
}

describe("availabilityToOptionMap", () => {
  it("returns OptionMap with empty options when no availabilities are provided", () => {
    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [],
    });

    expect(result.kind).toBe("time_options_v1");
    expect(result.activityId).toBe(123);
    expect(result.options).toHaveLength(0);
  });

  it("propagates the tz argument into the returned OptionMap", () => {
    const result = availabilityToOptionMap({
      activityId: 123,
      tz: "America/Sao_Paulo",
      availabilities: [makeAvailability()],
    });

    expect(result.tz).toBe("America/Sao_Paulo");
  });

  it("defaults tz to Europe/Madrid when tz is omitted", () => {
    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [makeAvailability()],
    });

    expect(result.tz).toBe("Europe/Madrid");
  });

  it("filters out availabilities with availabilityCount of 0", () => {
    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [
        makeAvailability({ id: "avail-with-slots", availabilityCount: 3 }),
        makeAvailability({ id: "avail-zero", availabilityCount: 0 }),
      ],
    });

    expect(result.options).toHaveLength(1);
    expect(result.options[0].availabilityId).toBe("avail-with-slots");
  });

  it("sorts availabilities by date then startTime", () => {
    const earlierDate = new Date("2025-06-15T00:00:00.000Z").getTime();
    const laterDate = new Date("2025-06-16T00:00:00.000Z").getTime();

    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [
        makeAvailability({ id: "later-date", date: laterDate, startTime: "09:00" }),
        makeAvailability({ id: "same-day-later-time", date: earlierDate, startTime: "14:00" }),
        makeAvailability({ id: "same-day-earlier-time", date: earlierDate, startTime: "10:00" }),
      ],
    });

    expect(result.options).toHaveLength(3);
    expect(result.options[0].availabilityId).toBe("same-day-earlier-time");
    expect(result.options[1].availabilityId).toBe("same-day-later-time");
    expect(result.options[2].availabilityId).toBe("later-date");
  });

  it("respects the limit parameter", () => {
    const availabilities = Array.from({ length: 5 }, (_, i) =>
      makeAvailability({
        id: `avail-${i}`,
        startTimeId: 1000 + i,
        startTime: `${(10 + i).toString().padStart(2, "0")}:00`,
      })
    );

    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities,
      limit: 3,
    });

    expect(result.options).toHaveLength(3);
  });

  it("assigns optionId as sequential string numbers starting at 1", () => {
    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [
        makeAvailability({ id: "avail-a", startTime: "09:00" }),
        makeAvailability({ id: "avail-b", startTime: "10:00" }),
      ],
    });

    expect(result.options[0].optionId).toBe("1");
    expect(result.options[1].optionId).toBe("2");
  });

  it("sets createdAt to a recent timestamp", () => {
    const before = Date.now();
    const result = availabilityToOptionMap({
      activityId: 123,
      availabilities: [],
    });
    const after = Date.now();

    expect(result.createdAt).toBeGreaterThanOrEqual(before);
    expect(result.createdAt).toBeLessThanOrEqual(after);
  });
});
