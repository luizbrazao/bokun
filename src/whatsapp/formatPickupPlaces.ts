export type FormatPickupPlacesArgs = {
  activityTitle?: string;
  options: Array<{ title: string; address?: string; id?: string | number }>;
};

export type FormattedPickupPlaces = {
  text: string;
  pickupOptionMap: Array<{ index: number; pickupPlaceId?: string | number }>;
};

const MAX_OPTIONS = 8;

export function formatPickupPlaces(args: FormatPickupPlacesArgs): FormattedPickupPlaces {
  const options = args.options.slice(0, MAX_OPTIONS);

  if (options.length === 0) {
    return {
      text: "Não encontrei locais de pickup disponíveis no momento.",
      pickupOptionMap: [],
    };
  }

  const firstLine = args.activityTitle
    ? `Locais de pickup para ${args.activityTitle}:`
    : "Locais de pickup:";

  const lines = options.map((option, index) => {
    const base = `${index + 1}) ${option.title}`;
    return option.address ? `${base} - ${option.address}` : base;
  });

  const pickupOptionMap = options.map((option, index) => ({
    index: index + 1,
    pickupPlaceId: option.id,
  }));

  return {
    text: [firstLine, ...lines].join("\n"),
    pickupOptionMap,
  };
}
