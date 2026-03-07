import { NavLink } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { LayoutDashboard, BookOpen, MessageSquare, Headset, Settings, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface SidebarProps {
  tenantId?: string;
}

const CHATPLUG_LOGO_SRC = "/chatplug-newlogo.svg";
const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type TenantForTrial = {
  stripeStatus?: string;
  stripeCurrentPeriodEnd?: number;
  createdAt?: number;
} | null;

function resolveTrialState(tenant: TenantForTrial): { state: "active"; daysLeft: number } | { state: "ended" } | null {
  if (!tenant) return null;

  const status = tenant.stripeStatus ?? null;
  if (status === "active") {
    return null;
  }

  const now = Date.now();

  // Stripe trial is authoritative only when status is explicitly "trialing".
  if (
    status === "trialing" &&
    typeof tenant.stripeCurrentPeriodEnd === "number" &&
    tenant.stripeCurrentPeriodEnd > 0
  ) {
    const stripeTrialEndMs = tenant.stripeCurrentPeriodEnd * 1000;
    if (now >= stripeTrialEndMs) {
      return { state: "ended" };
    }
    const daysLeft = Math.max(1, Math.ceil((stripeTrialEndMs - now) / DAY_MS));
    return { state: "active", daysLeft };
  }

  // Non-trialing Stripe states are not trial-active.
  if (status && status !== "trialing") {
    return { state: "ended" };
  }

  // Pre-Stripe/new tenant fallback: 7-day trial since tenant creation.
  const createdAtMs =
    typeof tenant.createdAt === "number" && tenant.createdAt > 0 ? tenant.createdAt : now;
  const trialEndMs = createdAtMs + TRIAL_DAYS * DAY_MS;

  if (now >= trialEndMs) {
    return { state: "ended" };
  }

  const daysLeft = Math.max(1, Math.ceil((trialEndMs - now) / DAY_MS));
  return { state: "active", daysLeft };
}

export function Sidebar({ tenantId }: SidebarProps) {
  const { signOut } = useAuthActions();
  const { t } = useI18n();
  const tenant = useQuery(api.userTenants.getMyTenant, {});

  const navItems = [
    { to: "/overview", label: t("sidebar.overview"), icon: LayoutDashboard },
    { to: "/reservas", label: t("sidebar.bookings"), icon: BookOpen },
    { to: "/conversas", label: t("sidebar.conversations"), icon: MessageSquare },
    { to: "/webhooks", label: t("sidebar.webhooks"), icon: AlertTriangle },
    { to: "/atendimento", label: t("sidebar.support"), icon: Headset, showBadge: true },
    { to: "/configuracoes", label: t("sidebar.settings"), icon: Settings },
  ];

  const handoffCount = useQuery(
    api.dashboard.countActiveHandoffs,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const trial = resolveTrialState(tenant);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="border-b p-4 flex justify-center">
        <img
          src={CHATPLUG_LOGO_SRC}
          alt="ChatPlug"
          className="h-9 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && handoffCount != null && handoffCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                {handoffCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3 space-y-3">
        {trial?.state === "active" && (
          <div className="rounded-lg border border-[#052A2E] bg-[#052A2E] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white">{t("sidebar.trialActive")}</span>
              <Badge variant="secondary" className="border-0 bg-[#CCF048] text-[#052A2E]">
                {t("sidebar.trialDaysLeft", { days: trial.daysLeft })}
              </Badge>
            </div>
          </div>
        )}
        {trial?.state === "ended" && (
          <div className="rounded-lg border border-[#052A2E] bg-[#052A2E] p-3 space-y-2">
            <p className="text-xs font-semibold text-white">{t("sidebar.trialEnded")}</p>
            <NavLink
              to="/configuracoes?tab=assinatura"
              className="inline-flex w-full items-center justify-center rounded-md bg-[#CCF048] px-3 py-2 text-xs font-medium text-[#052A2E] transition-colors hover:opacity-90"
            >
              {t("sidebar.choosePlan")}
            </NavLink>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {t("common.signOut")}
        </Button>
      </div>
    </aside>
  );
}
