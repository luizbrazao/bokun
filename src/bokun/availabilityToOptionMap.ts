// src/bokun/availabilityToOptionMap.ts

export type BokunAvailability = {
    id: string;
    activityId: number;
    startTime: string; // "HH:mm"
    startTimeId: number;
    date: number; // epoch ms do dia
    localizedDate?: string;
    availabilityCount: number;
    minParticipants: number;
    minParticipantsToBookNow?: number;
    defaultRateId?: number;
    pickupAllotment?: boolean;
    pickupAvailabilityCount?: number;
    rates?: Array<{
        id: number;
        title: string;
        pricedPerPerson: boolean;
        minPerBooking: number;
        maxPerBooking: number;
        pickupSelectionType?: string;
        tieredPricingEnabled?: boolean;
        pricingCategoryIds?: number[];
    }>;
    pricesByRate?: Array<{
        activityRateId: number;
        pricePerCategoryUnit: Array<{
            id: number; // pricingCategoryId
            amount: { amount: number; currency: string };
            minParticipantsRequired: number;
            maxParticipantsRequired: number;
        }>;
    }>;
};

export type TimeOption = {
    optionId: string; // "1".."9" ou "A" etc.
    availabilityId: string; // bokun availability.id
    activityId: number;
    startTimeId: number;
    dateKey: string; // YYYY-MM-DD (Europe/Madrid)
    display: string; // string pro WhatsApp
    meta: {
        availabilityCount: number;
        minParticipants: number;
        defaultRateId?: number;
        rateTitle?: string;
        pickupSelectionType?: string; // inferido do rate
    };
};

export type OptionMap = {
    kind: "time_options_v1";
    createdAt: number;
    tz: string;
    activityId: number;
    options: TimeOption[];
};

function formatDateKey(epochMs: number, tz: string): string {
    // epochMs é o "dia" que veio do Bokun. Formata data na timezone do tenant.
    const d = new Date(epochMs);
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(d); // en-CA -> YYYY-MM-DD
}

function formatDisplay(epochMs: number, startTimeHHmm: string, tz: string): string {
    // compõe dia + hora como texto. (A hora já vem "local" do produto, mas exibimos junto da data formatada)
    const d = new Date(epochMs);
    const parts = new Intl.DateTimeFormat("pt-BR", {
        timeZone: tz,
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    }).formatToParts(d);

    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";

    // ex: "ter. 24/02 10:00"
    return `${weekday} ${day}/${month} ${startTimeHHmm}`;
}

export function availabilityToOptionMap(args: {
    activityId: number;
    tz?: string;
    availabilities: BokunAvailability[];
    limit?: number; // ex: 9
}): OptionMap {
    const tz = args.tz ?? "Europe/Madrid"; // default preserved for backward compat
    const limit = Math.max(1, Math.min(args.limit ?? 9, 20));

    // 1) filtra só as que têm vaga e ordena por (date, startTime)
    const usable = args.availabilities
        .filter((a) => (a.availabilityCount ?? 0) > 0)
        .sort((a, b) => {
            if (a.date !== b.date) return a.date - b.date;
            return String(a.startTime).localeCompare(String(b.startTime));
        })
        .slice(0, limit);

    // 2) gera opções com optionId "1.."
    const options: TimeOption[] = usable.map((a, idx) => {
        const optionId = String(idx + 1);
        const defaultRate = a.rates?.find((r) => r.id === a.defaultRateId);
        const defaultRateTitle = defaultRate?.title?.trim();
        const fallbackRateTitle = a.rates?.find((r) => typeof r.title === "string" && r.title.trim().length > 0)?.title?.trim();
        const rateTitle = defaultRateTitle || fallbackRateTitle || undefined;

        const pickupSelectionType =
            defaultRate?.pickupSelectionType ??
            a.rates?.[0]?.pickupSelectionType ??
            "UNKNOWN";
        const baseDisplay = formatDisplay(a.date, a.startTime, tz);
        const display = rateTitle ? `${baseDisplay} (${rateTitle})` : baseDisplay;

        return {
            optionId,
            availabilityId: a.id,
            activityId: a.activityId,
            startTimeId: a.startTimeId,
            dateKey: formatDateKey(a.date, tz),
            display,
            meta: {
                availabilityCount: a.availabilityCount,
                minParticipants: a.minParticipants,
                defaultRateId: a.defaultRateId,
                rateTitle,
                pickupSelectionType,
            },
        };
    });

    return {
        kind: "time_options_v1",
        createdAt: Date.now(),
        tz,
        activityId: args.activityId,
        options,
    };
}
