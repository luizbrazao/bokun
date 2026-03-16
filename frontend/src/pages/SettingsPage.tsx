import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Copy, RefreshCw, UserMinus, Pencil, Save, Globe, Check } from "lucide-react";
import { type Locale, useI18n } from "@/i18n";

function formatDate(ts?: number | null) {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
    return "—";
  }

  // Handle both milliseconds and legacy seconds timestamps.
  const normalizedTs = ts < 1_000_000_000_000 ? ts * 1000 : ts;
  const date = new Date(normalizedTs);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function getAllTimezoneOptions(): string[] {
  const intlWithSupportedValues = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };

  const fallback = [
    "UTC",
    "Europe/Lisbon",
    "Europe/Madrid",
    "Europe/London",
    "America/Sao_Paulo",
    "America/New_York",
  ];

  const discovered =
    typeof intlWithSupportedValues.supportedValuesOf === "function"
      ? intlWithSupportedValues.supportedValuesOf("timeZone")
      : [];

  return Array.from(new Set(["UTC", ...discovered, ...fallback])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function roleLabel(role: string, t: (key: string) => string) {
  switch (role) {
    case "owner":
      return <Badge variant="default">{t("settings.team.roleOwner")}</Badge>;
    case "admin":
      return <Badge variant="secondary">{t("settings.team.roleAdmin")}</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

/* ─── WhatsApp Tab ─── */

const WHATSAPP_WEBHOOK_URL = "https://api.bokun.iaoperators.com/whatsapp/webhook";
const WHATSAPP_VERIFY_TOKEN = "chatplug";

function WhatsAppTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const channel = useQuery(
    api.dashboard.getWhatsAppChannel,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const upsert = useMutation(api.whatsappChannels.upsert);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
  });

  const startEdit = () => {
    setForm({
      phoneNumberId: channel?.phoneNumberId ?? "",
      wabaId: channel?.wabaId ?? "",
      accessToken: "",
    });
    setEditing(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.phoneNumberId.trim() || !form.wabaId.trim() || !form.accessToken.trim()) return;
    setSaving(true);
    try {
      await upsert({
        tenantId: tenantId as any,
        phoneNumberId: form.phoneNumberId.trim(),
        wabaId: form.wabaId.trim(),
        accessToken: form.accessToken.trim(),
        verifyToken: WHATSAPP_VERIFY_TOKEN,
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (channel === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.whatsapp.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const showForm = channel === null || editing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("settings.whatsapp.cardTitle")}</CardTitle>
          {saved && <Badge variant="success">{t("settings.saved")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.whatsapp.metaInstructions")}{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">
                Meta Developer Portal
              </a>.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="wa-webhook-url">{t("settings.whatsapp.webhookUrlLabel")}</Label>
                <Input id="wa-webhook-url" value={WHATSAPP_WEBHOOK_URL} readOnly className="font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="wa-verify-fixed">{t("settings.whatsapp.verifyTokenLabel")}</Label>
                <Input id="wa-verify-fixed" value={WHATSAPP_VERIFY_TOKEN} readOnly className="font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="wa-phone">Phone Number ID</Label>
                <Input id="wa-phone" value={form.phoneNumberId} onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))} placeholder="Ex: 123456789012345" />
              </div>
              <div>
                <Label htmlFor="wa-waba">WABA ID</Label>
                <Input id="wa-waba" value={form.wabaId} onChange={(e) => setForm((f) => ({ ...f, wabaId: e.target.value }))} placeholder="Ex: 123456789012345" />
              </div>
              <div>
                <Label htmlFor="wa-token">Access Token</Label>
                <Input id="wa-token" type="password" value={form.accessToken} onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} placeholder="Token permanente do Meta" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={channel.status === "active" ? <Badge variant="success">{t("settings.statusActive")}</Badge> : <Badge variant="warning">{t("settings.statusInactive")}</Badge>} />
            <InfoRow label="Webhook URL" value={<span className="font-mono text-xs">{WHATSAPP_WEBHOOK_URL}</span>} />
            <InfoRow label="Verify Token" value={<span className="font-mono text-xs">{WHATSAPP_VERIFY_TOKEN}</span>} />
            <InfoRow label="Phone Number ID" value={<span className="font-mono text-xs">{channel.phoneNumberId}</span>} />
            <InfoRow label="WABA ID" value={<span className="font-mono text-xs">{channel.wabaId}</span>} />
            <InfoRow label={t("settings.configuredAt")} value={formatDate(channel.createdAt)} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                {t("common.edit")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Telegram Tab ─── */

function TelegramTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const channel = useQuery(
    api.dashboard.getTelegramChannel,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const upsertAndRegisterWebhook = useAction(api.telegramActions.upsertAndRegisterWebhook);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    botToken: "",
    botUsername: "",
    webhookSecret: "",
    operatorGroupChatId: "",
  });

  const startEdit = () => {
    setForm({
      botToken: "",
      botUsername: channel?.botUsername ?? "",
      webhookSecret: "",
      operatorGroupChatId: channel?.operatorGroupChatId ? String(channel.operatorGroupChatId) : "",
    });
    setEditing(true);
    setSaved(false);
    setErrorMessage(null);
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    setForm((f) => ({ ...f, webhookSecret: secret }));
  };

  const handleSave = async () => {
    const botUsername = form.botUsername.trim().replace(/^@/, "");
    if (!botUsername) {
      setErrorMessage(t("settings.telegram.errorBotUsernameRequired"));
      return;
    }
    const parsedGroupId = form.operatorGroupChatId.trim();
    if (parsedGroupId.length > 0 && !/^-?\d+$/.test(parsedGroupId)) {
      setErrorMessage(t("settings.telegram.errorGroupIdNumeric"));
      return;
    }

    setErrorMessage(null);
    setSaving(true);
    try {
      const groupId = parsedGroupId;
      await upsertAndRegisterWebhook({
        tenantId: tenantId as any,
        ...(form.botToken.trim().length > 0 ? { botToken: form.botToken.trim() } : {}),
        botUsername,
        ...(form.webhookSecret.trim().length > 0 ? { webhookSecret: form.webhookSecret.trim() } : {}),
        ...(groupId.length > 0 ? { operatorGroupChatId: Number(groupId) } : {}),
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.telegram.saveError");
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (channel === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.telegram.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const showForm = channel === null || editing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("settings.telegram.cardTitle")}</CardTitle>
          {saved && <Badge variant="success">{t("settings.saved")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.telegram.instructions").split("@BotFather")[0]}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
                @BotFather
              </a>
              {t("settings.telegram.instructions").split("@BotFather")[1]}
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tg-token">Bot Token</Label>
                <Input
                  id="tg-token"
                  type="password"
                  value={form.botToken}
                  onChange={(e) => setForm((f) => ({ ...f, botToken: e.target.value }))}
                  placeholder={channel && editing ? t("settings.telegram.keepTokenPlaceholder") : "Ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.telegram.tokenHelp")}
                </p>
              </div>
              <div>
                <Label htmlFor="tg-username">{t("settings.telegram.botUsernameLabel")}</Label>
                <Input id="tg-username" value={form.botUsername} onChange={(e) => setForm((f) => ({ ...f, botUsername: e.target.value }))} placeholder="Ex: meu_bot" />
              </div>
              <div>
                <Label htmlFor="tg-secret">{t("settings.telegram.webhookSecretLabel")}</Label>
                <div className="flex gap-2">
                  <Input id="tg-secret" value={form.webhookSecret} onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))} placeholder={t("settings.telegram.webhookSecretPlaceholder")} className="flex-1" />
                  <Button variant="outline" size="sm" onClick={generateSecret} type="button">
                    {t("settings.telegram.generate")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.telegram.webhookSecretHelp")}
                </p>
              </div>
              <div>
                <Label htmlFor="tg-operator-group">{t("settings.telegram.operatorGroupLabel")}</Label>
                <Input id="tg-operator-group" value={form.operatorGroupChatId} onChange={(e) => setForm((f) => ({ ...f, operatorGroupChatId: e.target.value }))} placeholder="Ex: -1001234567890" />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.telegram.operatorGroupHelp")}
                </p>
              </div>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.telegram.webhookAutoRegistered")}
            </p>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={channel.status === "active" ? <Badge variant="success">{t("settings.statusActive")}</Badge> : <Badge variant="warning">{t("settings.statusInactive")}</Badge>} />
            <InfoRow label="Bot" value={<span className="font-mono text-xs">@{channel.botUsername}</span>} />
            {channel.operatorGroupChatId && (
              <InfoRow label={t("settings.telegram.operatorGroup")} value={<span className="font-mono text-xs">{channel.operatorGroupChatId}</span>} />
            )}
            <InfoRow label={t("settings.configuredAt")} value={formatDate(channel.createdAt)} />
            {channel.updatedAt !== channel.createdAt && (
              <InfoRow label={t("settings.updatedAt")} value={formatDate(channel.updatedAt)} />
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                {t("common.edit")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Bokun Tab ─── */

function BokunTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const installation = useQuery(
    api.dashboard.getBokunInstallation,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const upsert = useMutation(api.bokunInstallations.upsertBokunInstallation);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    baseUrl: "https://api.bokun.io",
    accessKey: "",
    secretKey: "",
  });

  const startEdit = () => {
    setForm({
      baseUrl: installation?.baseUrl ?? "https://api.bokun.io",
      accessKey: "",
      secretKey: "",
    });
    setEditing(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.baseUrl.trim() || !form.accessKey.trim() || !form.secretKey.trim()) return;
    setSaving(true);
    try {
      await upsert({
        tenantId: tenantId as any,
        baseUrl: form.baseUrl.trim(),
        authHeaders: {
          "X-Bokun-AccessKey": form.accessKey.trim(),
          "X-Bokun-SecretKey": form.secretKey.trim(),
        },
        scopes: ["bookings", "activities"],
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (installation === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.bokun.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const showForm = installation === null || editing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("settings.bokun.cardTitle")}</CardTitle>
          {saved && <Badge variant="success">{t("settings.saved")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.bokun.instructions")}
            </p>

            {/* Manual config form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="bokun-url">Base URL</Label>
                <Input id="bokun-url" value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.bokun.io" />
              </div>
              <div>
                <Label htmlFor="bokun-access">Access Key</Label>
                <Input id="bokun-access" type="password" value={form.accessKey} onChange={(e) => setForm((f) => ({ ...f, accessKey: e.target.value }))} placeholder={t("settings.bokun.accessKeyPlaceholder")} />
              </div>
              <div>
                <Label htmlFor="bokun-secret">Secret Key</Label>
                <Input id="bokun-secret" type="password" value={form.secretKey} onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))} placeholder={t("settings.bokun.secretKeyPlaceholder")} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={<Badge variant="success">{t("settings.statusConnected")}</Badge>} />
            <InfoRow label="Base URL" value={<span className="font-mono text-xs">{installation.baseUrl}</span>} />
            <InfoRow label={t("settings.scopes")} value={installation.scopes?.join(", ") ?? "-"} />
            <InfoRow label={t("settings.connectedAt")} value={formatDate(installation.createdAt)} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                {t("settings.bokun.reconnect")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Team Tab ─── */

function TeamTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const tenantInfo = useQuery(
    api.dashboard.getTenantInfo,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const teamMembers = useQuery(
    api.userTenants.listTeamMembers,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );

  const generateCode = useMutation(api.tenants.generateInviteCode);
  const removeMember = useMutation(api.userTenants.removeTeamMember);

  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    email?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = async () => {
    if (!tenantId) return;
    await generateCode({ tenantId: tenantId as any });
  };

  const handleCopyCode = async () => {
    const code = tenantInfo?.inviteCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async () => {
    if (!tenantId || !confirmRemove) return;
    try {
      await removeMember({
        tenantId: tenantId as any,
        memberUserId: confirmRemove.userId as any,
      });
    } catch {
      // error handling could be added
    }
    setConfirmRemove(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Invite Code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("settings.team.inviteCodeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.team.inviteCodeDescription")}
            </p>
            {tenantInfo?.inviteCode ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-md bg-muted px-4 py-2.5 font-mono text-lg tracking-widest text-center">
                  {tenantInfo.inviteCode}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? t("settings.team.copied") : t("settings.team.copy")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateCode}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t("settings.team.regenerate")}
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateCode}>
                {t("settings.team.generateInviteCode")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("settings.team.membersTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("settings.team.noMembers")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings.team.member")}</TableHead>
                    <TableHead>{t("settings.team.role")}</TableHead>
                    <TableHead>{t("settings.team.since")}</TableHead>
                    <TableHead className="w-[80px]">{t("settings.team.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium">
                            {m.name ?? t("settings.team.noName")}
                          </span>
                          {m.email && (
                            <span className="block text-xs text-muted-foreground">
                              {m.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{roleLabel(m.role, t)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        {m.role !== "owner" && !m.isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setConfirmRemove({
                                userId: m.userId,
                                email: m.email ?? undefined,
                              })
                            }
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.team.removeMemberTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.team.confirmRemovePre")}{" "}
              <strong>{confirmRemove?.email ?? t("settings.team.thisMember")}</strong>{" "}
              {t("settings.team.confirmRemovePost")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              {t("settings.team.remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── IA (OpenAI) Tab ─── */

function IATab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const settings = useQuery(
    api.tenants.getOpenAISettings,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const updateSettings = useMutation(api.tenants.updateOpenAISettings);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
  });

  const startEdit = () => {
    setForm({
      openaiApiKey: "",
      openaiModel: settings?.openaiModel ?? "gpt-4o-mini",
    });
    setEditing(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.openaiApiKey.trim()) return;
    setSaving(true);
    try {
      await updateSettings({
        tenantId: tenantId as any,
        openaiApiKey: form.openaiApiKey.trim(),
        openaiModel: form.openaiModel,
      });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (settings === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.ia.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const showForm = !settings?.hasKey || editing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("settings.ia.cardTitle")}</CardTitle>
          {saved && <Badge variant="success">{t("settings.saved")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.ia.instructions").split("platform.openai.com/api-keys")[0]}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                platform.openai.com/api-keys
              </a>.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="openai-key">API Key</Label>
                <Input id="openai-key" type="password" value={form.openaiApiKey} onChange={(e) => setForm((f) => ({ ...f, openaiApiKey: e.target.value }))} placeholder="sk-..." />
              </div>
              <div>
                <Label htmlFor="openai-model">{t("settings.ia.modelLabel")}</Label>
                <select
                  id="openai-model"
                  value={form.openaiModel}
                  onChange={(e) => setForm((f) => ({ ...f, openaiModel: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="gpt-4o-mini">{t("settings.ia.modelRecommended")}</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.ia.modelHelp")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={<Badge variant="success">{t("settings.statusConfigured")}</Badge>} />
            <InfoRow label="API Key" value={<span className="font-mono text-xs">{settings.maskedKey}</span>} />
            <InfoRow label={t("settings.ia.modelLabel")} value={settings.openaiModel ?? "gpt-4o-mini"} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                {t("common.edit")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Perfil Tab ─── */

function PerfilTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const profile = useQuery(api.tenants.getTenantProfile, { tenantId: tenantId as any });
  const updateProfile = useMutation(api.tenants.updateTenantProfile);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timezoneOptions = useMemo(() => getAllTimezoneOptions(), []);
  const [form, setForm] = useState({
    businessName: "",
    logoUrl: "",
    contactEmail: "",
    timezone: "Europe/Madrid",
    language: "pt",
  });

  // Sync form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName ?? "",
        logoUrl: profile.logoUrl ?? "",
        contactEmail: profile.contactEmail ?? "",
        timezone: profile.timezone ?? "Europe/Madrid",
        language: profile.language ?? "pt",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        tenantId: tenantId as any,
        businessName: form.businessName,
        logoUrl: form.logoUrl,
        contactEmail: form.contactEmail,
        timezone: form.timezone,
        language: form.language,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.profile.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("settings.profile.cardTitle")}</CardTitle>
          {saved && <Badge variant="success">{t("settings.saved")}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("settings.profile.instructions")}
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="perfil-name">{t("settings.profile.businessNameLabel")}</Label>
              <Input
                id="perfil-name"
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                placeholder="Es: IA Operators"
              />
            </div>
            <div>
              <Label htmlFor="perfil-logo">{t("settings.profile.logoUrlLabel")}</Label>
              <Input
                id="perfil-logo"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="perfil-email">{t("settings.profile.contactEmailLabel")}</Label>
              <Input
                id="perfil-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="perfil-tz">{t("settings.profile.timezoneLabel")}</Label>
              <select
                id="perfil-tz"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.profile.timezoneHelp")}
              </p>
            </div>
            <div>
              <Label htmlFor="perfil-lang">{t("settings.profile.botLanguageLabel")}</Label>
              <select
                id="perfil-lang"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="pt">{t("settings.profile.langPt")}</option>
                <option value="en">{t("settings.profile.langEn")}</option>
                <option value="es">{t("settings.profile.langEs")}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.profile.botLanguageHelp")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? t("settings.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Assinatura Tab ─── */

function AssinaturaTab({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const profile = useQuery(api.tenants.getTenantProfile, { tenantId: tenantId as any });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Read ?checkout=success or ?checkout=cancelled from URL
  const searchParams = new URLSearchParams(window.location.search);
  const checkoutState = searchParams.get("checkout");

  const handleCheckout = async (plan: "monthly" | "annual") => {
    setLoadingCheckout(true);
    setCheckoutError(null);
    try {
      const inferredApiBase =
        window.location.hostname === "bokun.iaoperators.com"
          ? "https://api.bokun.iaoperators.com"
          : window.location.origin;
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? inferredApiBase;
      const res = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, tenantId }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? t("settings.subscription.checkoutError"));
      }
    } catch {
      setCheckoutError(t("settings.subscription.networkError"));
    } finally {
      setLoadingCheckout(false);
    }
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="success">{t("settings.subscription.statusActive")}</Badge>;
      case "trialing":
        return <Badge variant="default" className="bg-blue-500">{t("settings.subscription.statusTrialing")}</Badge>;
      case "past_due":
        return <Badge variant="warning">{t("settings.subscription.statusPastDue")}</Badge>;
      case "canceled":
        return <Badge variant="destructive">{t("settings.subscription.statusCanceled")}</Badge>;
      default:
        return <Badge variant="outline">{t("settings.subscription.statusNoPlan")}</Badge>;
    }
  };

  if (profile === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("settings.subscription.cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Checkout result banners */}
      {checkoutState === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t("settings.subscription.checkoutSuccess")}
        </div>
      )}
      {checkoutState === "cancelled" && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {t("settings.subscription.checkoutCancelled")}
        </div>
      )}

      {/* Current plan status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("settings.subscription.currentPlanTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label={t("settings.subscription.state")} value={statusLabel(profile?.stripeStatus ?? null)} />
          {profile?.stripeCurrentPeriodEnd && (
            <InfoRow
              label={profile?.stripeStatus === "trialing" ? t("settings.subscription.trialEnd") : t("settings.subscription.nextInvoice")}
              value={new Date(profile.stripeCurrentPeriodEnd * 1000).toLocaleDateString("pt-BR")}
            />
          )}
          {profile?.stripeSubscriptionId && (
            <InfoRow
              label={t("settings.subscription.subscriptionId")}
              value={
                <span className="font-mono text-xs">
                  ...{profile.stripeSubscriptionId.slice(-8)}
                </span>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Plan selection (same visual language as Landing pricing block) */}
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-slate-900">{t("settings.subscription.plansTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
            {t("settings.subscription.plansSubtitle")}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border-subtle bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-3xl font-semibold text-slate-900">{t("settings.subscription.monthly")}</h3>
              <span className="rounded-full bg-accent-cream px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                {t("settings.subscription.monthlyBadge")}
              </span>
            </div>
            <p className="mb-5 text-sm text-text-secondary">
              {t("settings.subscription.monthlyDescription")}
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t("settings.subscription.feature1")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t("settings.subscription.feature2")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t("settings.subscription.feature3")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t("settings.subscription.feature4")}</li>
            </ul>
            <p className="font-display mt-7 text-5xl text-slate-900">€29</p>
            <p className="mt-1 text-xs text-text-secondary">{t("settings.subscription.perMonth")}</p>
            <button
              type="button"
              className="mt-4 inline-flex w-full justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/90 disabled:opacity-60"
              onClick={() => handleCheckout("monthly")}
              disabled={loadingCheckout}
            >
              {t("settings.subscription.subscribeMonthly")}
            </button>
          </article>

          <article className="rounded-2xl border border-black bg-black p-6 text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-3xl font-semibold">{t("settings.subscription.annual")}</h3>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase">
                {t("settings.subscription.annualBadge")}
              </span>
            </div>
            <p className="mb-5 text-sm text-white/70">
              {t("settings.subscription.annualDescription")}
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{t("settings.subscription.annualFeature1")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{t("settings.subscription.annualFeature2")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{t("settings.subscription.annualFeature3")}</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{t("settings.subscription.annualFeature4")}</li>
            </ul>
            <p className="font-display mt-7 text-5xl">€290</p>
            <p className="mt-1 text-xs text-white/70">{t("settings.subscription.perYear")}</p>
            <button
              type="button"
              className="mt-4 inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-60"
              onClick={() => handleCheckout("annual")}
              disabled={loadingCheckout}
            >
              {t("settings.subscription.subscribeAnnual")}
            </button>
          </article>
        </div>

        {checkoutError && (
          <p className="mt-4 text-sm text-destructive">{checkoutError}</p>
        )}
      </section>
    </div>
  );
}

/* ─── Main Page ─── */

const SettingsPage = () => {
  const { tenantId } = useTenant();
  const { t, locale, setLocale } = useI18n();
  const [tab, setTab] = useState("whatsapp");
  const [showLocaleMenu, setShowLocaleMenu] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    const allowedTabs = new Set(["whatsapp", "telegram", "bokun", "ia", "equipe", "perfil", "assinatura"]);
    if (tabParam && allowedTabs.has(tabParam)) {
      setTab(tabParam);
    }
  }, []);

  return (
    <div className="dashboard-surface min-h-full -m-8 p-6 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl md:text-5xl font-display leading-[1.02] text-deep-ink">
          {t("settings.title")}
        </h1>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowLocaleMenu((v) => !v)}
            aria-label={t("common.language")}
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{locale}</span>
          </Button>
          {showLocaleMenu && (
            <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-md border bg-white shadow-lg p-1">
              {[
                { value: "pt", label: "Português" },
                { value: "en", label: "English" },
                { value: "es", label: "Español" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setLocale(item.value as Locale);
                    setShowLocaleMenu(false);
                  }}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                    locale === item.value ? "bg-muted font-medium" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="whatsapp">{t("settings.tabs.whatsapp")}</TabsTrigger>
          <TabsTrigger value="telegram">{t("settings.tabs.telegram")}</TabsTrigger>
          <TabsTrigger value="bokun">{t("settings.tabs.bokun")}</TabsTrigger>
          <TabsTrigger value="ia">{t("settings.tabs.ia")}</TabsTrigger>
          <TabsTrigger value="equipe">{t("settings.tabs.team")}</TabsTrigger>
          <TabsTrigger value="perfil">{t("settings.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="assinatura">{t("settings.tabs.subscription")}</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          {tenantId && <WhatsAppTab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="telegram">
          {tenantId && <TelegramTab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="bokun">
          {tenantId && <BokunTab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="ia">
          {tenantId && <IATab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="equipe" className="space-y-4">
          {tenantId && <TeamTab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="perfil">
          {tenantId && <PerfilTab tenantId={tenantId} />}
        </TabsContent>

        <TabsContent value="assinatura" className="space-y-4">
          {tenantId && <AssinaturaTab tenantId={tenantId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
