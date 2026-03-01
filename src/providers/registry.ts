import { bokunAdapter } from "./bokunAdapter.ts";
import type { BookingProviderAdapter, ProviderName } from "./types.ts";

const ADAPTERS = new Map<string, BookingProviderAdapter>([[bokunAdapter.provider, bokunAdapter]]);

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

export function getProviderAdapter(provider: ProviderName): BookingProviderAdapter | null {
  const normalized = normalizeProvider(String(provider));
  return ADAPTERS.get(normalized) ?? null;
}

export function getProviderAdapterOrThrow(provider: ProviderName): BookingProviderAdapter {
  const adapter = getProviderAdapter(provider);
  if (!adapter) {
    throw new Error(`Provider não suportado: ${provider}`);
  }
  return adapter;
}

export function registerProviderAdapter(adapter: BookingProviderAdapter): void {
  ADAPTERS.set(normalizeProvider(String(adapter.provider)), adapter);
}
