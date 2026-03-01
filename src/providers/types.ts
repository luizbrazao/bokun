export type ProviderName = "bokun" | "altegio" | (string & {});

export type ProviderListServicesArgs = {
  tenantId: string;
};

export type ProviderCheckAvailabilityArgs = {
  tenantId: string;
  activityId: string;
  date: string;
  currency?: string;
  lang?: string;
};

export type ProviderCheckBookingDetailsArgs = {
  tenantId: string;
  confirmationCode: string;
};

export type BookingProviderAdapter = {
  provider: ProviderName;
  listServices: (args: ProviderListServicesArgs) => Promise<unknown>;
  checkAvailability: (args: ProviderCheckAvailabilityArgs) => Promise<unknown>;
  checkBookingDetails?: (args: ProviderCheckBookingDetailsArgs) => Promise<unknown>;
};
