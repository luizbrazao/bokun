import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

const ConversationsPage = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const conversations = useQuery(
    api.dashboard.listConversations,
    tenantId ? { tenantId } : "skip",
  );

  const filtered = conversations?.filter((c) => {
    if (!search) return true;
    return c.waUserId.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversas</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="text-lg">Conversas WhatsApp</CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {conversations === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered && filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Última mensagem</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((c) => (
                  <TableRow
                    key={c._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/conversas/${encodeURIComponent(c.waUserId)}`)
                    }
                  >
                    <TableCell className="font-mono text-xs">
                      ...{c.waUserId.slice(-8)}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      {c.lastMessage ? (
                        <span className="text-xs text-muted-foreground truncate block">
                          {c.lastMessage.role === "user" ? "Cliente: " : "Bot: "}
                          {c.lastMessage.content}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.lastActivityId ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(c.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsPage;
