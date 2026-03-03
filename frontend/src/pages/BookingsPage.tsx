// DASH-04: All required columns present — confirmation code (bokunConfirmationCode), status, customer phone (waUserId), activity date (date).
import { useState } from "react";
import { useQuery } from "convex/react";
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

type StatusFilter = "all" | "confirmed" | "draft" | "abandoned";

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="success">Confirmada</Badge>;
    case "abandoned":
      return <Badge variant="warning">Abandonada</Badge>;
    default:
      return <Badge variant="secondary">Rascunho</Badge>;
  }
}

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

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextStepLabel(step?: string) {
  const labels: Record<string, string> = {
    select_time: "Selecionar horário",
    select_pickup: "Selecionar pickup",
    ask_participants: "Informar participantes",
    ask_booking_questions: "Perguntas pré-reserva",
    collect_booking_answers: "Coletando respostas",
    confirm: "Aguardando confirmação",
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
  const bookings = useQuery(
    api.dashboard.listBookingDrafts,
    tenantId ? { tenantId } : "skip",
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const filtered = bookings?.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesClient = b.waUserId.toLowerCase().includes(q);
      const matchesCode = b.bokunConfirmationCode?.toLowerCase().includes(q);
      const matchesActivity = b.activityId?.toLowerCase().includes(q);
      if (!matchesClient && !matchesCode && !matchesActivity) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reservas</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="text-lg">Reservas</CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou código..."
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
                Todas{bookings ? ` (${bookings.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
              <TabsTrigger value="draft">Pendentes</TabsTrigger>
              <TabsTrigger value="abandoned">Abandonadas</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {bookings === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered && filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma reserva encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((b) => (
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
                    <TableCell>{statusBadge(b.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.bokunConfirmationCode ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(b.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog
        open={selectedBooking !== null}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
            <DialogDescription>
              {selectedBooking?.bokunConfirmationCode
                ? `Código: ${selectedBooking.bokunConfirmationCode}`
                : "Reserva em andamento"}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-1">
              <InfoRow label="Cliente" value={`...${selectedBooking.waUserId.slice(-8)}`} />
              <InfoRow label="Atividade" value={selectedBooking.activityId} />
              <InfoRow label="Data" value={selectedBooking.date} />
              <InfoRow label="Participantes" value={selectedBooking.participants} />
              <InfoRow label="Status" value={statusBadge(selectedBooking.status)} />
              <InfoRow label="Etapa atual" value={nextStepLabel(selectedBooking.nextStep)} />
              <InfoRow label="Código Bokun" value={selectedBooking.bokunConfirmationCode} />
              <InfoRow label="Booking ID" value={selectedBooking.bokunBookingId} />
              <InfoRow label="Pickup" value={selectedBooking.pickupPlaceId} />
              <InfoRow
                label="Confirmado em"
                value={selectedBooking.confirmedAt ? formatDateTime(selectedBooking.confirmedAt) : null}
              />
              <InfoRow label="Criado em" value={formatDateTime(selectedBooking.createdAt)} />
              <InfoRow label="Atualizado em" value={formatDateTime(selectedBooking.updatedAt)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsPage;
