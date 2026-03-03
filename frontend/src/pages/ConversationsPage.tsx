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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const PAGE_SIZE = 50;

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const conversations = useQuery(
    api.dashboard.listConversations,
    tenantId ? { tenantId } : "skip",
  );

  // DASH-03: filter by waUserId (customer phone), then by date range, then paginate
  const filtered = conversations?.filter((c) => {
    // 1. Filter by waUserId (text search — satisfies DASH-03 text search requirement)
    if (search && !c.waUserId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // 2. Filter by date range
    if (dateFrom && c.updatedAt < new Date(dateFrom).getTime()) {
      return false;
    }
    if (dateTo && c.updatedAt > new Date(dateTo + "T23:59:59").getTime()) {
      return false;
    }
    return true;
  });

  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = filtered ? Math.ceil(filtered.length / PAGE_SIZE) : 0;

  const hasDateFilter = dateFrom !== "" || dateTo !== "";

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversas</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="text-lg">Conversas WhatsApp</CardTitle>
          </div>
          <div className="flex flex-wrap gap-3 items-end mt-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">De:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(0);
                  }}
                  className="h-9 w-[140px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Até:</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(0);
                  }}
                  className="h-9 w-[140px]"
                />
              </div>
              {hasDateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDates}
                  className="h-9"
                >
                  Limpar
                </Button>
              )}
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
          ) : paginated && paginated.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            <>
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
                  {paginated?.map((c) => (
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

              {/* Pagination controls — shown only when more than PAGE_SIZE items */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages} ({filtered?.length} conversas)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsPage;
