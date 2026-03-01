import { getConvexClient } from "../convex/client.ts";
import { getProviderAdapterOrThrow } from "./registry.ts";
import type {
  ProviderCheckAvailabilityArgs,
  ProviderCheckBookingDetailsArgs,
  ProviderListServicesArgs,
  ProviderName,
} from "./types.ts";

type ResolveTenantProviderArgs = {
  tenantId: string;
  preferredProvider?: ProviderName;
};

export async function resolveTenantProvider(args: ResolveTenantProviderArgs): Promise<ProviderName> {
  if (args.preferredProvider && String(args.preferredProvider).trim().length > 0) {
    return args.preferredProvider;
  }

  const convex = getConvexClient();
  const provider = (await convex.query(
    "providerInstallations:getPrimaryProvider" as any,
    { tenantId: args.tenantId } as any
  )) as string | null;

  // Backward compatibility: default to bokun for old tenants/flows.
  return (provider ?? "bokun") as ProviderName;
}

export async function listServicesForTenant(
  args: ProviderListServicesArgs & { provider?: ProviderName }
): Promise<unknown> {
  const provider = await resolveTenantProvider({
    tenantId: args.tenantId,
    preferredProvider: args.provider,
  });
  const adapter = getProviderAdapterOrThrow(provider);
  return adapter.listServices({ tenantId: args.tenantId });
}

export async function checkAvailabilityForTenant(
  args: ProviderCheckAvailabilityArgs & { provider?: ProviderName }
): Promise<unknown> {
  const provider = await resolveTenantProvider({
    tenantId: args.tenantId,
    preferredProvider: args.provider,
  });
  const adapter = getProviderAdapterOrThrow(provider);
  return adapter.checkAvailability({
    tenantId: args.tenantId,
    activityId: args.activityId,
    date: args.date,
    currency: args.currency,
    lang: args.lang,
  });
}

export async function checkBookingDetailsForTenant(
  args: ProviderCheckBookingDetailsArgs & { provider?: ProviderName }
): Promise<unknown> {
  const provider = await resolveTenantProvider({
    tenantId: args.tenantId,
    preferredProvider: args.provider,
  });
  const adapter = getProviderAdapterOrThrow(provider);
  if (!adapter.checkBookingDetails) {
    throw new Error(`Provider ${provider} ainda não suporta consulta de booking.`);
  }
  return adapter.checkBookingDetails({
    tenantId: args.tenantId,
    confirmationCode: args.confirmationCode,
  });
}
