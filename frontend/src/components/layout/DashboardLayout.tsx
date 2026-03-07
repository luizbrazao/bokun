import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { Sidebar } from "./Sidebar";
import { useI18n } from "@/i18n";

export function DashboardLayout() {
  const { tenant, isLoading, hasTenant } = useTenant();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoading && !hasTenant) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, hasTenant, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground animate-pulse">{t("dashboardLayout.loadingOrg")}</p>
        </div>
      </div>
    );
  }

  if (!hasTenant) {
    return null; // O useEffect cuidará do redirecionamento
  }

  return (
    <div className="flex h-screen">
      <Sidebar tenantId={tenant!._id} />
      <main className="flex-1 overflow-auto bg-slate-50 p-8">
        <Outlet context={{ tenant }} />
      </main>
    </div>
  );
}
