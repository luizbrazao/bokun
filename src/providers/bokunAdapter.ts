import {
  bokunGetAvailabilitiesForTenant,
  bokunGetBookingForTenant,
  bokunSearchActivitiesForTenant,
} from "../bokun/gateway.ts";
import type {
  BookingProviderAdapter,
  ProviderCheckAvailabilityArgs,
  ProviderCheckBookingDetailsArgs,
  ProviderListServicesArgs,
} from "./types.ts";

export const bokunAdapter: BookingProviderAdapter = {
  provider: "bokun",
  listServices: async (args: ProviderListServicesArgs) => {
    return bokunSearchActivitiesForTenant({
      tenantId: args.tenantId,
      body: { page: 0, pageSize: 20 },
      lang: process.env.BOKUN_DEFAULT_LANG?.trim() ?? "EN",
      currency: process.env.BOKUN_DEFAULT_CURRENCY?.trim() ?? "EUR",
    });
  },
  checkAvailability: async (args: ProviderCheckAvailabilityArgs) => {
    return bokunGetAvailabilitiesForTenant({
      tenantId: args.tenantId,
      id: args.activityId,
      start: args.date,
      end: args.date,
      currency: args.currency ?? process.env.BOKUN_DEFAULT_CURRENCY?.trim() ?? "EUR",
      lang: args.lang ?? process.env.BOKUN_DEFAULT_LANG?.trim() ?? "EN",
    });
  },
  checkBookingDetails: async (args: ProviderCheckBookingDetailsArgs) => {
    return bokunGetBookingForTenant({
      tenantId: args.tenantId,
      confirmationCode: args.confirmationCode,
    });
  },
};
