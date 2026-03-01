import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="default" className="bg-emerald-600">Confirmada</Badge>;
    case "abandoned":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Abandonada</Badge>;
    default:
      return <Badge variant="secondary">Rascunho</Badge>;
  }
}

export default function OverviewPage() {
  const { tenantId } = useTenant();
  const stats = useQuery(
    api.dashboardStats.getDashboardStats,
    tenantId ? { tenantId } : "skip",
  );

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Visão Geral</h1>
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visão Geral</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalConversations}</p>
                <p className="text-xs text-muted-foreground">Conversas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Integration Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.whatsappConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm font-medium">WhatsApp</span>
              </div>
              <Badge
                variant={stats.whatsappConnected ? "default" : "secondary"}
                className={stats.whatsappConnected ? "bg-emerald-600" : ""}
              >
                {stats.whatsappConnected ? "Conectado" : "Não configurado"}
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
                {stats.bokunConnected ? "Conectado" : "Não configurado"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Reservas Recentes</CardTitle>
              <Link
                to="/reservas"
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma reserva ainda.
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
                        {b.date} · {timeAgo(b.updatedAt)}
                      </span>
                    </div>
                    {statusLabel(b.status)}
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
