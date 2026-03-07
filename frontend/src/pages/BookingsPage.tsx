import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { formatDateTimeByLocale, formatTimeAgo, useI18n } from "@/i18n";

type StatusFilter = "all" | "confirmed" | "pending" | "abandoned";

function statusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="success">{t("overview.statusConfirmed")}</Badge>;
    case "abandoned":
      return <Badge variant="warning">{t("overview.statusAbandoned")}</Badge>;
    default:
      return <Badge variant="secondary">{t("overview.statusDraft")}</Badge>;
  }
}

function formatDateTime(locale: "pt" | "en" | "es", ts: number) {
  return formatDateTimeByLocale(locale, ts, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesTopStatus(statusFilter: StatusFilter, status: string | undefined): boolean {
  const normalized = (status ?? "").toLowerCase();
  if (statusFilter === "all") return true;
  if (statusFilter === "confirmed") return normalized === "confirmed";
  if (statusFilter === "pending") return normalized === "pending" || normalized === "draft" || normalized === "reserved" || normalized === "requested";
  return normalized === "abandoned" || normalized === "cancelled" || normalized === "aborted" || normalized === "no_show";
}

function resolveBookingDateISO(entry: unknown): string | null {
  const safeEntry = entry as Record<string, unknown> | null;
  const direct = [
    safeEntry?.startDate,
    safeEntry?.activityDate,
    safeEntry?.date,
    safeEntry?.travelDate,
  ];
  for (const value of direct) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }

  const productBookings = Array.isArray(safeEntry?.productBookings) ? safeEntry.productBookings : [];
  for (const pb of productBookings) {
    if (pb && typeof pb === "object") {
      const record = pb as Record<string, unknown>;
      const v = record.startDate ?? record.date ?? record.activityDate;
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
  }

  if (typeof safeEntry?.creationDate === "string" && safeEntry.creationDate.trim().length > 0) {
    return safeEntry.creationDate;
  }
  return null;
}

function nextStepLabel(step: string | undefined, t: (key: string) => string) {
  const labels: Record<string, string> = {
    select_time: t("bookings.stepSelectTime"),
    select_pickup: t("bookings.stepSelectPickup"),
    ask_participants: t("bookings.stepAskParticipants"),
    ask_booking_questions: t("bookings.stepAskBookingQuestions"),
    collect_booking_answers: t("bookings.stepCollectBookingAnswers"),
    confirm: t("bookings.stepConfirm"),
  };
  return step ? labels[step] ?? step : "-";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-all">
        {value ?? "-"}
      </span>
    </div>
  );
}

const BookingsPage = () => {
  const { tenantId } = useTenant();
  const { locale, t } = useI18n();
  const bookings = useQuery(
    api.dashboard.listBookingDrafts,
    tenantId ? { tenantId } : "skip",
  );
  const searchBokunBookings = useAction((api as any).dashboard.listBokunBookingsByPeriod);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bokunBookings, setBokunBookings] = useState<any[] | null>(null);
  const [bokunTotalHits, setBokunTotalHits] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bokunStatus, setBokunStatus] = useState("ALL");
  const [bokunFromDate, setBokunFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return start.toISOString().slice(0, 10);
  });
  const [bokunToDate, setBokunToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const runSync = async () => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      const result = (await searchBokunBookings({
        tenantId,
        fromDate: bokunFromDate,
        toDate: bokunToDate,
        statuses: bokunStatus === "ALL" ? [] : [bokunStatus],
        page: 1,
        pageSize: 50,
      })) as { items?: any[]; totalHits?: number };
      setBokunBookings(Array.isArray(result?.items) ? result.items : []);
      setBokunTotalHits(typeof result?.totalHits === "number" ? result.totalHits : 0);
    } catch {
      setBokunBookings([]);
      setBokunTotalHits(0);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    void runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, bokunFromDate, bokunToDate, bokunStatus]);

  const filteredDrafts = bookings?.filter((b) => {
    if (!matchesTopStatus(statusFilter, b.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesClient = b.waUserId.toLowerCase().includes(q);
      const matchesCode = b.bokunConfirmationCode?.toLowerCase().includes(q);
      const matchesActivity = b.activityId?.toLowerCase().includes(q);
      if (!matchesClient && !matchesCode && !matchesActivity) return false;
    }
    return true;
  });

  const filteredBokun = (bokunBookings ?? []).filter((b) => {
    if (!matchesTopStatus(statusFilter, b.status)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const haystack = [
      b.confirmationCode,
      b.customerName,
      b.customerEmail,
      b.productTitle,
      b.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const bokunCounters = (bokunBookings ?? []).reduce(
    (acc, item) => {
      acc.all += 1;
      if (matchesTopStatus("confirmed", item.status)) acc.confirmed += 1;
      if (matchesTopStatus("pending", item.status)) acc.pending += 1;
      if (matchesTopStatus("abandoned", item.status)) acc.abandoned += 1;
      return acc;
    },
    { all: 0, confirmed: 0, pending: 0, abandoned: 0 },
  );

  return (
    <div className="dashboard-surface min-h-full -m-8 p-6 md:p-8 space-y-6 md:space-y-8">
      <h1 className="text-4xl md:text-5xl font-display leading-[1.02] text-deep-ink">{t("bookings.title")}</h1>

      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("bookings.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            className="mt-2"
          >
            <TabsList>
              <TabsTrigger value="all">
                {t("common.all")} ({bokunCounters.all})
              </TabsTrigger>
              <TabsTrigger value="confirmed">{t("bookings.confirmed")} ({bokunCounters.confirmed})</TabsTrigger>
              <TabsTrigger value="pending">{t("bookings.pending")} ({bokunCounters.pending})</TabsTrigger>
              <TabsTrigger value="abandoned">{t("bookings.abandoned")} ({bokunCounters.abandoned})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{t("bookings.bokunBookingsTitle")}</h3>
              <button
                type="button"
                onClick={() => void runSync()}
                disabled={isSyncing}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("bookings.startDate")}</label>
                <Input
                  type="date"
                  value={bokunFromDate}
                  onChange={(e) => setBokunFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("bookings.endDate")}</label>
                <Input
                  type="date"
                  value={bokunToDate}
                  onChange={(e) => setBokunToDate(e.target.value)}
                />
              </div>
              <select
                value={bokunStatus}
                onChange={(e) => setBokunStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos os status</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="RESERVED">RESERVED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="ABORTED">ABORTED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </div>
            {bokunBookings === null || isSyncing ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`bokun-sync-${i}`} className="h-8 w-full" />
                ))}
              </div>
            ) : filteredBokun.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem reservas sincronizadas da Bokun.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("bookings.bokunTotal", { total: bokunTotalHits })}
                </p>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("bookings.code")}</TableHead>
                    <TableHead>{t("bookings.client")}</TableHead>
                    <TableHead>{t("bookings.activity")}</TableHead>
                    <TableHead>{t("bookings.date")}</TableHead>
                    <TableHead>{t("bookings.status")}</TableHead>
                    <TableHead>{t("bookings.updated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBokun.map((b, idx) => (
                    <TableRow key={`${b.confirmationCode ?? "code"}-${idx}`}>
                      <TableCell className="font-mono text-xs">
                        {b.confirmationCode ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {b.customerName ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {b.productTitle ?? "-"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const rawDate = resolveBookingDateISO(b);
                          if (!rawDate) return "-";
                          const parsed = Date.parse(rawDate);
                          return Number.isNaN(parsed) ? rawDate : formatDateTime(locale, parsed);
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.status ?? "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.creationDate ? formatDateTime(locale, Date.parse(b.creationDate)) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </div>

          <div className="mb-3">
            <h3 className="text-base font-semibold">Drafts do Bot</h3>
          </div>
          {bookings === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredDrafts && filteredDrafts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("bookings.none")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("bookings.client")}</TableHead>
                  <TableHead>{t("bookings.activity")}</TableHead>
                  <TableHead>{t("bookings.date")}</TableHead>
                  <TableHead>{t("bookings.participants")}</TableHead>
                  <TableHead>{t("bookings.status")}</TableHead>
                  <TableHead>{t("bookings.code")}</TableHead>
                  <TableHead>{t("bookings.updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrafts?.map((b) => (
                  <TableRow
                    key={b._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedBooking(b)}
                  >
                    <TableCell className="font-mono text-xs">
                      ...{b.waUserId.slice(-8)}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {b.activityId}
                    </TableCell>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{b.participants ?? "-"}</TableCell>
                    <TableCell>{statusBadge(b.status, t)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.bokunConfirmationCode ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimeAgo(t, b.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedBooking !== null}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookings.detailsTitle")}</DialogTitle>
            <DialogDescription>
              {selectedBooking?.bokunConfirmationCode
                ? `Código: ${selectedBooking.bokunConfirmationCode}`
                : t("bookings.reservationInProgress")}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-1">
              <InfoRow label={t("bookings.client")} value={`...${selectedBooking.waUserId.slice(-8)}`} />
              <InfoRow label={t("bookings.activity")} value={selectedBooking.activityId} />
              <InfoRow label={t("bookings.date")} value={selectedBooking.date} />
              <InfoRow label={t("bookings.participants")} value={selectedBooking.participants} />
              <InfoRow label={t("bookings.status")} value={statusBadge(selectedBooking.status, t)} />
              <InfoRow label={t("bookings.currentStep")} value={nextStepLabel(selectedBooking.nextStep, t)} />
              <InfoRow label={t("bookings.bokunCode")} value={selectedBooking.bokunConfirmationCode} />
              <InfoRow label={t("bookings.bookingId")} value={selectedBooking.bokunBookingId} />
              <InfoRow label={t("bookings.pickup")} value={selectedBooking.pickupPlaceId} />
              <InfoRow
                label={t("bookings.confirmedAt")}
                value={selectedBooking.confirmedAt ? formatDateTime(locale, selectedBooking.confirmedAt) : null}
              />
              <InfoRow label={t("bookings.createdAt")} value={formatDateTime(locale, selectedBooking.createdAt)} />
              <InfoRow label={t("bookings.updatedAt")} value={formatDateTime(locale, selectedBooking.updatedAt)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsPage;
