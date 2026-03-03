import { NavLink } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { LayoutDashboard, BookOpen, MessageSquare, Headset, Settings, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/overview", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/reservas", label: "Reservas", icon: BookOpen },
  { to: "/conversas", label: "Conversas", icon: MessageSquare },
  { to: "/webhooks", label: "Webhooks", icon: AlertTriangle },
  { to: "/atendimento", label: "Atendimento", icon: Headset, showBadge: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  tenantName: string;
  tenantId?: string;
}

export function Sidebar({ tenantName, tenantId }: SidebarProps) {
  const { signOut } = useAuthActions();

  const handoffCount = useQuery(
    api.dashboard.countActiveHandoffs,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold truncate">{tenantName}</h2>
        <p className="text-xs text-muted-foreground">Bokun WhatsApp Bot</p>
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

      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
