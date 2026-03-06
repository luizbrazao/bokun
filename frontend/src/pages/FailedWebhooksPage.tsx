import { useQuery, useMutation } from "convex/react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeByLocale, useI18n } from "@/i18n";

function formatDateTime(locale: "pt" | "en" | "es", ts: number): string {
  return formatDateTimeByLocale(locale, ts, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceBadge(source: string) {
  switch (source) {
    case "whatsapp":
      return <Badge className="bg-green-100 text-green-800 border-green-300">WhatsApp</Badge>;
    case "bokun":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Bokun</Badge>;
    case "stripe":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Stripe</Badge>;
    default:
      return <Badge variant="secondary">{source}</Badge>;
  }
}

function statusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "failed":
      return <Badge variant="destructive">{t("failedWebhooks.statusFailed")}</Badge>;
    case "retried":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{t("failedWebhooks.statusRetried")}</Badge>;
    case "resolved":
      return <Badge className="bg-green-100 text-green-800 border-green-300">{t("failedWebhooks.statusResolved")}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const FailedWebhooksPage = () => {
  const { tenantId } = useTenant();
  const { locale, t } = useI18n();
  const webhooks = useQuery(
    api.failedWebhooks.listFailedWebhooks,
    tenantId ? { tenantId } : "skip",
  );
  const retry = useMutation(api.failedWebhooks.markWebhookRetried);

  const handleRetry = async (webhookId: string) => {
    if (!tenantId) return;
    await retry({ webhookId: webhookId as Parameters<typeof retry>[0]["webhookId"], tenantId });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("failedWebhooks.title")}</h1>

      <p className="text-sm text-muted-foreground">
        {t("failedWebhooks.description")}
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("failedWebhooks.recordsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("failedWebhooks.none")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("failedWebhooks.type")}</TableHead>
                  <TableHead>{t("failedWebhooks.datetime")}</TableHead>
                  <TableHead>{t("failedWebhooks.reason")}</TableHead>
                  <TableHead>{t("failedWebhooks.hash")}</TableHead>
                  <TableHead>{t("failedWebhooks.attempts")}</TableHead>
                  <TableHead>{t("failedWebhooks.status")}</TableHead>
                  <TableHead>{t("failedWebhooks.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook._id}>
                    <TableCell>{sourceBadge(webhook.source)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(locale, webhook.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-xs truncate block" title={webhook.errorReason}>
                        {webhook.errorReason.length > 60
                          ? webhook.errorReason.slice(0, 60) + "..."
                          : webhook.errorReason}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {webhook.payloadHash.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="text-center">{webhook.retryCount}</TableCell>
                    <TableCell>{statusBadge(webhook.status, t)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          webhook.status === "resolved" || webhook.status === "retried"
                        }
                        onClick={() => handleRetry(webhook._id)}
                      >
                        {t("failedWebhooks.retry")}
                      </Button>
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

export default FailedWebhooksPage;
