import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/api";

export function useTenant() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  // Só executa a query quando há sessão autenticada confirmada no Convex.
  const tenant = useQuery(
    api.userTenants.getMyTenant,
    isAuthenticated ? {} : "skip",
  );

  // isLoading é verdadeiro enquanto auth carrega OU enquanto a query ainda não respondeu
  const isLoading = isAuthLoading || (isAuthenticated && tenant === undefined);

  const state = {
    tenant: tenant ?? null,
    isLoading,
    hasTenant: !!tenant,
    tenantId: tenant?._id ?? null,
  };

  return state;
}
