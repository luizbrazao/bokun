export type FormatAvailabilityOptionsArgs = {
  activityTitle?: string;
  date: string;
  options: Array<{ label: string; startTimeId?: string | number; soldOut?: boolean }>;
  language?: "pt" | "en" | "es";
};

export type FormattedAvailabilityOptions = {
  text: string;
  optionMap: Array<{ index: number; startTimeId?: string | number }>;
};

const MAX_OPTIONS = 8;

export function formatAvailabilityOptions(args: FormatAvailabilityOptionsArgs): FormattedAvailabilityOptions {
  const options = args.options.slice(0, MAX_OPTIONS);
  const lang = args.language ?? "pt";

  if (options.length === 0) {
    return {
      text:
        lang === "en"
          ? `I couldn't find available times for ${args.date}. Want to try another date?`
          : lang === "es"
            ? `No encontré horarios disponibles para ${args.date}. ¿Quieres probar otra fecha?`
            : `Não encontrei horários disponíveis para ${args.date}. Quer tentar outra data?`,
      optionMap: [],
    };
  }

  const firstLine = args.activityTitle
    ? lang === "en"
      ? `Available times for ${args.activityTitle} on ${args.date}`
      : lang === "es"
        ? `Horarios disponibles para ${args.activityTitle} en ${args.date}`
        : `Horários disponíveis para ${args.activityTitle} em ${args.date}`
    : lang === "en"
      ? `Available times on ${args.date}`
      : lang === "es"
        ? `Horarios disponibles en ${args.date}`
        : `Horários disponíveis em ${args.date}`;

  const lines = options.map((option, index) => `${index + 1}) ${option.label}`);
  const optionMap = options.map((option, index) => ({
    index: index + 1,
    startTimeId: option.startTimeId,
  }));

  return {
    text: [firstLine, ...lines].join("\n"),
    optionMap,
  };
}
