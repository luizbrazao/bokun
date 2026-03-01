export type NormalizedAvailabilityOption = {
  date: string;
  label: string;
  startTimeId?: string | number;
  startTime?: string;
  availabilityCount?: number;
  unlimitedAvailability?: boolean;
  soldOut?: boolean;
  pickupSoldOut?: boolean;
  raw: unknown;
};

export type NormalizeArgs = {
  requestedDate: string;
  items: Array<Record<string, unknown>>;
  timeZone?: string;
  maxOptions?: number;
};

const DEFAULT_TIME_ZONE = "Europe/Madrid";
const DEFAULT_MAX_OPTIONS = 8;
const INCLUDE_SOLD_OUT = false;

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function isHHMM(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalId(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
}

function toYmdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMinutes(hhmm: string): number | null {
  if (!isHHMM(hhmm)) {
    return null;
  }
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

function getIsoDateCandidate(item: Record<string, unknown>): string | null {
  const candidates = [item.startDateTime, item.datetime];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return null;
}

export function parseAvailabilityDateToYMD(item: Record<string, unknown>): string | null {
  const rawDate = item.date;

  if (typeof rawDate === "number" && Number.isFinite(rawDate)) {
    const parsed = new Date(rawDate);
    if (!isValidDate(parsed)) {
      return null;
    }
    return toYmdUtc(parsed);
  }

  if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  return null;
}

export function extractStartTimeLabel(item: Record<string, unknown>, timeZone: string): string | null {
  const directStartTime = item.startTime;
  if (typeof directStartTime === "string" && isHHMM(directStartTime)) {
    return directStartTime;
  }

  const isoCandidate = getIsoDateCandidate(item);
  if (!isoCandidate) {
    return null;
  }

  const parsed = new Date(isoCandidate);
  if (!isValidDate(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

export function normalizeAvailabilities(args: NormalizeArgs): NormalizedAvailabilityOption[] {
  const timeZone = args.timeZone ?? DEFAULT_TIME_ZONE;
  const maxOptions = args.maxOptions ?? DEFAULT_MAX_OPTIONS;

  const dedup = new Set<string>();
  const normalized = args.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => parseAvailabilityDateToYMD(item) === args.requestedDate)
    .filter(({ item }) => {
      const unavailable = item.unavailable === true;
      const soldOut = item.soldOut === true;

      if (unavailable) {
        return false;
      }
      if (!INCLUDE_SOLD_OUT && soldOut) {
        return false;
      }
      return true;
    })
    .map(({ item, index }) => {
      const startTimeId = toOptionalId(item.startTimeId);
      const itemId = toOptionalId(item.id);
      const rawStartTime = typeof item.startTime === "string" ? item.startTime : undefined;
      const timeLabel = extractStartTimeLabel(item, timeZone);
      const availabilityCount = toNumberOrUndefined(item.availabilityCount);
      const unlimitedAvailability = item.unlimitedAvailability === true;
      const soldOut = item.soldOut === true;
      const pickupSoldOut = item.pickupSoldOut === true;
      const dedupKey = startTimeId !== undefined
        ? `startTimeId:${String(startTimeId)}`
        : rawStartTime
          ? `startTime:${rawStartTime}`
          : itemId !== undefined
            ? `id:${String(itemId)}`
            : `index:${index}`;

      return {
        item,
        index,
        dedupKey,
        startTimeLabel: timeLabel,
        startTimeId,
        availabilityCount,
        unlimitedAvailability,
        soldOut,
        pickupSoldOut,
      };
    })
    .filter((entry) => {
      if (dedup.has(entry.dedupKey)) {
        return false;
      }
      dedup.add(entry.dedupKey);
      return true;
    })
    .sort((a, b) => {
      const aMinutes = a.startTimeLabel ? toMinutes(a.startTimeLabel) : null;
      const bMinutes = b.startTimeLabel ? toMinutes(b.startTimeLabel) : null;

      if (aMinutes !== null && bMinutes !== null) {
        return aMinutes - bMinutes;
      }
      if (aMinutes !== null && bMinutes === null) {
        return -1;
      }
      if (aMinutes === null && bMinutes !== null) {
        return 1;
      }
      return a.index - b.index;
    })
    .slice(0, maxOptions)
    .map((entry) => {
      const baseLabel = entry.startTimeLabel ?? "Dia todo";
      const hasAvailabilityCount = entry.availabilityCount !== undefined;
      const withCapacityLabel = entry.unlimitedAvailability
        ? baseLabel
        : hasAvailabilityCount
          ? `${baseLabel} (${entry.availabilityCount} vagas)`
          : baseLabel;

      return {
        date: args.requestedDate,
        label: withCapacityLabel,
        startTimeId: entry.startTimeId,
        startTime: entry.startTimeLabel ?? undefined,
        availabilityCount: entry.availabilityCount,
        unlimitedAvailability: entry.unlimitedAvailability,
        soldOut: entry.soldOut,
        pickupSoldOut: entry.pickupSoldOut,
        raw: entry.item,
      };
    });

  return normalized;
}
