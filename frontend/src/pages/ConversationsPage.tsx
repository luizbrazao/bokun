import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, MessageSquareText, Bot, UserRound } from "lucide-react";
import { formatTimeAgo, useI18n } from "@/i18n";

const PAGE_SIZE = 50;
type ChannelFilter = "wa" | "tg";

function resolveChannel(waUserId: string, handoffChannel?: string): ChannelFilter {
  if (handoffChannel === "tg" || waUserId.startsWith("tg:")) return "tg";
  return "wa";
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `+${digits}`;
}

function getClientLabel(c: any): string {
  if (typeof c?.customerName === "string" && c.customerName.trim().length > 0) {
    return c.customerName.trim();
  }
  if (typeof c?.clientName === "string" && c.clientName.trim().length > 0) {
    return c.clientName.trim();
  }
  if (typeof c?.waUserId === "string" && c.waUserId.startsWith("tg:")) {
    const tgId = c.waUserId.replace(/^tg:/, "");
    return `Telegram ${tgId}`;
  }
  return formatPhoneDisplay(c?.waUserId ?? "-");
}

const ConversationsPage = () => {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [channel, setChannel] = useState<ChannelFilter>("wa");

  const conversations = useQuery(api.dashboard.listConversations, tenantId ? { tenantId } : "skip");

  const filtered = conversations?.filter((c) => {
    const currentChannel = resolveChannel(c.waUserId, c.handoffChannel);
    if (currentChannel !== channel) return false;

    if (search) {
      const q = search.toLowerCase();
      const clientLabel = getClientLabel(c).toLowerCase();
      if (!c.waUserId.toLowerCase().includes(q) && !clientLabel.includes(q)) return false;
    }
    if (dateFrom && c.updatedAt < new Date(dateFrom).getTime()) return false;
    if (dateTo && c.updatedAt > new Date(dateTo + "T23:59:59").getTime()) return false;
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
    <div className="dashboard-surface min-h-full -m-8 p-6 md:p-8 space-y-6 md:space-y-8">
      <header className="space-y-3">
        <span className="dashboard-chip">Customer Thread Intelligence</span>
        <h1 className="text-4xl md:text-5xl font-display leading-[1.02] text-deep-ink">{t("conversations.title")}</h1>
        <p className="text-sm md:text-base text-text-secondary max-w-2xl">
          {t("conversations.subtitle")}
        </p>
      </header>

      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-xl font-display text-deep-ink">
              <div className="inline-flex rounded-lg border border-border-subtle bg-white p-1 gap-1">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    channel === "wa" ? "bg-[#052A2E] text-[#CCF048]" : "text-text-secondary hover:bg-muted"
                  }`}
                  onClick={() => {
                    setChannel("wa");
                    setPage(0);
                  }}
                >
                  {t("conversations.channelWhatsApp")}
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    channel === "tg" ? "bg-[#052A2E] text-[#CCF048]" : "text-text-secondary hover:bg-muted"
                  }`}
                  onClick={() => {
                    setChannel("tg");
                    setPage(0);
                  }}
                >
                  {t("conversations.channelTelegram")}
                </button>
              </div>
            </CardTitle>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("conversations.searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9 h-9 bg-white"
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
                    className="h-9 w-[140px] bg-white"
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
                    className="h-9 w-[140px] bg-white"
                  />
                </div>
                {hasDateFilter && (
                  <Button variant="ghost" size="sm" onClick={clearDates} className="h-9">
                    {t("conversations.clear")}
                  </Button>
                )}
              </div>
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
            <p className="text-text-secondary text-center py-8">{t("conversations.none")}</p>
          ) : (
            <>
              <div className="rounded-xl border border-border-subtle overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("conversations.client")}</TableHead>
                      <TableHead>{t("conversations.lastMessage")}</TableHead>
                      <TableHead>{t("conversations.updated")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated?.map((c) => (
                      <TableRow
                        key={c._id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`/conversas/${encodeURIComponent(c.waUserId)}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-text-secondary" />
                            {getClientLabel(c)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[340px]">
                          {c.lastMessage ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              {c.lastMessage.role === "user" ? (
                                <UserRound className="inline mr-1 h-3.5 w-3.5" />
                              ) : (
                                <Bot className="inline mr-1 h-3.5 w-3.5" />
                              )}
                              {c.lastMessage.role === "user" ? t("conversations.customerPrefix") : t("conversations.botPrefix")}
                              {c.lastMessage.content}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTimeAgo(t, c.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
                  <MessageSquareText className="h-4 w-4" />
                  {t("conversations.pageInfo", {
                    page: page + 1,
                    total: totalPages || 1,
                    count: filtered?.length ?? 0,
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
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
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsPage;
