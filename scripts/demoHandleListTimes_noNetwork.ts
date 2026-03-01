import { normalizeAvailabilities } from "../src/bokun/availabilityNormalizer.ts";
import { formatAvailabilityOptions } from "../src/whatsapp/formatAvailabilityOptions.ts";

const activityTitle = "Passeio de Barco Premium";
const requestedDate = "2026-02-16";

const availabilitiesFixture: Array<Record<string, unknown>> = [
  {
    id: "a1",
    date: Date.parse("2026-02-16T00:00:00.000Z"),
    startTimeId: "st-08",
    startTime: "08:00",
    availabilityCount: 23,
  },
  {
    id: "a1-dup",
    date: "2026-02-16",
    startTimeId: "st-08",
    startTime: "08:00",
    availabilityCount: 20,
  },
  {
    id: "a2",
    date: "2026-02-16",
    startTimeId: "st-10",
    startTime: "10:00",
    availabilityCount: 5,
  },
  {
    id: "a3",
    date: "2026-02-17",
    startTimeId: "st-09",
    startTime: "09:00",
    availabilityCount: 12,
  },
  {
    id: "a4",
    date: "2026-02-16",
    startTimeId: "st-12",
    startTime: "12:00",
    soldOut: true,
    availabilityCount: 0,
  },
  {
    id: "a5",
    date: "2026-02-16",
    startDateTime: "2026-02-16T14:30:00Z",
    unlimitedAvailability: true,
  },
];

const normalized = normalizeAvailabilities({
  requestedDate,
  items: availabilitiesFixture,
});

const formatted = formatAvailabilityOptions({
  activityTitle,
  date: requestedDate,
  options: normalized.map((option) => ({
    label: option.label,
    startTimeId: option.startTimeId,
    soldOut: option.soldOut,
  })),
});

console.log(formatted.text);
console.log(JSON.stringify(formatted.optionMap, null, 2));
