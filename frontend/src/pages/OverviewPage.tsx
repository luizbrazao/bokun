import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  MessageSquare,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatTimeAgo, useI18n } from "@/i18n";

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "confirmed":
      return (
        <Badge variant="default" className="bg-emerald-600">
          {t("overview.statusConfirmed")}
        </Badge>
      );
    case "abandoned":
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          {t("overview.statusAbandoned")}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{t("overview.statusDraft")}</Badge>;
  }
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <Card className="dashboard-card">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${accent}`}>{icon}</div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-[0.08em]">{label}</p>
            <p className="text-3xl font-semibold font-display text-deep-ink leading-none mt-2">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { tenantId } = useTenant();
  const { t } = useI18n();
  const stats = useQuery(api.dashboardStats.getDashboardStats, tenantId ? { tenantId } : "skip");
  const toggleBot = useMutation(api.tenants.updateTenantStatus);
  const [isToggling, setIsToggling] = useState(false);

  const handleBotToggle = async () => {
    if (!tenantId || !stats || isToggling) return;
    setIsToggling(true);
    try {
      await toggleBot({
        tenantId,
        status: stats.botStatus === "active" ? "disabled" : "active",
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (!stats) {
    return (
      <div className="dashboard-surface min-h-full -m-8 p-6 md:p-8 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="dashboard-card">
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-3" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const botActive = stats.botStatus === "active";

  return (
    <div className="dashboard-surface min-h-full -m-8 p-6 md:p-8 space-y-6 md:space-y-8">
      <header className="space-y-3">
        <span className="dashboard-chip">Operational Intelligence</span>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display leading-[1.02] text-deep-ink">
              {t("overview.title")}
            </h1>
          </div>
          <div className="w-fit rounded-2xl border border-[#052A2E] bg-[#052A2E] px-4 py-3">
            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-white/80">{t("overview.botStatus")}</p>
            <div className="flex items-center gap-3">
              <span className={botActive ? "text-sm font-semibold text-[#CCF048]" : "text-sm font-semibold text-white/70"}>
                {botActive ? t("overview.botActive") : t("overview.botDisabled")}
              </span>
              <button
                role="switch"
                aria-checked={botActive}
                aria-label={t("overview.toggleBot")}
                disabled={isToggling}
                onClick={handleBotToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#CCF048] focus:ring-offset-2 focus:ring-offset-[#052A2E] disabled:cursor-not-allowed disabled:opacity-50 ${
                  botActive ? "bg-[#CCF048]" : "bg-white/25"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#052A2E] shadow transition-transform ${
                    botActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<MessageSquare className="h-5 w-5 text-blue-700" />}
          label={t("overview.messagesToday")}
          value={stats.messagesToday}
          accent="bg-blue-100"
        />
        <MetricCard
          icon={<CalendarCheck className="h-5 w-5 text-emerald-700" />}
          label={t("overview.bookingsWeek")}
          value={stats.bookingsThisWeek}
          accent="bg-emerald-100"
        />
        <MetricCard
          icon={<MessageSquare className="h-5 w-5 text-violet-700" />}
          label={t("overview.conversations")}
          value={stats.totalConversations}
          accent="bg-violet-100"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5 text-lime-900" />}
          label={t("overview.conversion")}
          value={`${stats.conversionRate}%`}
          accent="bg-lime-200"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-display text-deep-ink">{t("overview.integrations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.whatsappConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm font-medium">{t("overview.whatsapp")}</span>
              </div>
              <Badge variant={stats.whatsappConnected ? "default" : "secondary"} className={stats.whatsappConnected ? "bg-emerald-600" : ""}>
                {stats.whatsappConnected ? t("overview.connected") : t("overview.notConfigured")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("overview.telegram")}</span>
              <Badge variant={stats.telegramConnected ? "default" : "secondary"} className={stats.telegramConnected ? "bg-emerald-600" : ""}>
                {stats.telegramConnected ? t("overview.connected") : t("overview.notConfigured")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bokun</span>
              <Badge variant={stats.bokunConnected ? "default" : "secondary"} className={stats.bokunConnected ? "bg-emerald-600" : ""}>
                {stats.bokunConnected ? t("overview.connected") : t("overview.notConfigured")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-display text-deep-ink">{t("overview.recentBookings")}</CardTitle>
              <Link to="/reservas" className="text-xs text-primary hover:text-primary/80 font-medium">
                {t("overview.seeAll")}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentBookings.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">{t("overview.noneYet")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentBookings.map((b) => (
                  <div key={b._id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">...{b.waUserId.slice(-8)}</span>
                      <span className="text-xs text-text-secondary">
                        {b.date} · {formatTimeAgo(t, b.updatedAt)}
                      </span>
                    </div>
                    {statusLabel(b.status, t)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
