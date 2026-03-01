export type FormatAvailabilityOptionsArgs = {
  activityTitle?: string;
  date: string;
  options: Array<{ label: string; startTimeId?: string | number; soldOut?: boolean }>;
};

export type FormattedAvailabilityOptions = {
  text: string;
  optionMap: Array<{ index: number; startTimeId?: string | number }>;
};

const MAX_OPTIONS = 8;

export function formatAvailabilityOptions(args: FormatAvailabilityOptionsArgs): FormattedAvailabilityOptions {
  const options = args.options.slice(0, MAX_OPTIONS);

  if (options.length === 0) {
    return {
      text: `Não encontrei horários disponíveis para ${args.date}. Quer tentar outra data?`,
      optionMap: [],
    };
  }

  const firstLine = args.activityTitle
    ? `Horários disponíveis para ${args.activityTitle} em ${args.date}`
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
