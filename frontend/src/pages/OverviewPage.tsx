import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatTimeAgo, useI18n } from "@/i18n";

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="default" className="bg-emerald-600">{t("overview.statusConfirmed")}</Badge>;
    case "abandoned":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">{t("overview.statusAbandoned")}</Badge>;
    default:
      return <Badge variant="secondary">{t("overview.statusDraft")}</Badge>;
  }
}

export default function OverviewPage() {
  const { tenantId } = useTenant();
  const { t } = useI18n();
  const stats = useQuery(
    api.dashboardStats.getDashboardStats,
    tenantId ? { tenantId } : "skip",
  );
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("overview.title")}</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-40" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const botActive = stats.botStatus === "active";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("overview.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.messagesToday}</p>
                <p className="text-xs text-muted-foreground">{t("overview.messagesToday")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CalendarCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.bookingsThisWeek}</p>
                <p className="text-xs text-muted-foreground">{t("overview.bookingsWeek")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("overview.botStatus")}</p>
                <Badge
                  variant={botActive ? "default" : "secondary"}
                  className={botActive ? "bg-emerald-600" : "bg-slate-200 text-slate-600"}
                >
                  {botActive ? t("overview.botActive") : t("overview.botDisabled")}
                </Badge>
              </div>
              <button
                role="switch"
                aria-checked={botActive}
                aria-label={t("overview.toggleBot")}
                disabled={isToggling}
                onClick={handleBotToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  botActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    botActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${stats.whatsappConnected ? "bg-emerald-100" : "bg-slate-100"}`}
              >
                {stats.whatsappConnected ? (
                  <Wifi className="h-5 w-5 text-emerald-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("overview.whatsapp")}</p>
                <Badge
                  variant={stats.whatsappConnected ? "default" : "secondary"}
                  className={stats.whatsappConnected ? "bg-emerald-600" : ""}
                >
                  {stats.whatsappConnected ? t("overview.connected") : t("overview.disconnected")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("overview.insights")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{stats.confirmedCount}</p>
                  <p className="text-xs text-muted-foreground">{t("overview.confirmed")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{stats.pendingCount}</p>
                  <p className="text-xs text-muted-foreground">{t("overview.pending")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{stats.totalConversations}</p>
                  <p className="text-xs text-muted-foreground">{t("overview.conversations")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{stats.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">{t("overview.conversion")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("overview.integrations")}</CardTitle>
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
              <Badge
                variant={stats.whatsappConnected ? "default" : "secondary"}
                className={stats.whatsappConnected ? "bg-emerald-600" : ""}
              >
                {stats.whatsappConnected ? t("overview.connected") : t("overview.notConfigured")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.bokunConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm font-medium">Bokun</span>
              </div>
              <Badge
                variant={stats.bokunConnected ? "default" : "secondary"}
                className={stats.bokunConnected ? "bg-emerald-600" : ""}
              >
                {stats.bokunConnected ? t("overview.connected") : t("overview.notConfigured")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("overview.recentBookings")}</CardTitle>
              <Link
                to="/reservas"
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                {t("overview.seeAll")}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("overview.noneYet")}
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentBookings.map((b) => (
                  <div
                    key={b._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        ...{b.waUserId.slice(-8)}
                      </span>
                      <span className="text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
