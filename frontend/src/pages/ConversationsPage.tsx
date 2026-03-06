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
import { formatTimeAgo, useI18n } from "@/i18n";

const PAGE_SIZE = 50;

const ConversationsPage = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const conversations = useQuery(
    api.dashboard.listConversations,
    tenantId ? { tenantId } : "skip",
  );

  const filtered = conversations?.filter((c) => {
    if (search && !c.waUserId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
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
      <h1 className="text-2xl font-bold">{t("conversations.title")}</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="text-lg">{t("conversations.whatsAppTitle")}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-3 items-end mt-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("conversations.searchPlaceholder")}
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
                <Label className="text-xs text-muted-foreground">{t("conversations.from")}</Label>
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
                <Label className="text-xs text-muted-foreground">{t("conversations.to")}</Label>
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
                  {t("conversations.clear")}
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
              {t("conversations.none")}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("conversations.client")}</TableHead>
                    <TableHead>{t("conversations.lastMessage")}</TableHead>
                    <TableHead>{t("conversations.lastActivity")}</TableHead>
                    <TableHead>{t("conversations.updated")}</TableHead>
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
                            {c.lastMessage.role === "user" ? t("conversations.customerPrefix") : t("conversations.botPrefix")}
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
                        {formatTimeAgo(t, c.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    {t("conversations.pageInfo", {
                      page: page + 1,
                      total: totalPages,
                      count: filtered?.length ?? 0,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("common.next")}
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
