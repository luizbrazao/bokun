import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Copy, RefreshCw, UserMinus, Pencil, Save } from "lucide-react";
import { useI18n } from "@/i18n";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
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

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return <Badge variant="default">Dono</Badge>;
    case "admin":
      return <Badge variant="secondary">Admin</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

/* ─── WhatsApp Tab ─── */

const WHATSAPP_WEBHOOK_URL = "https://api.bokun.iaoperators.com/whatsapp/webhook";
const WHATSAPP_VERIFY_TOKEN = "chatplug";

function WhatsAppTab({ tenantId }: { tenantId: string }) {
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
        <CardHeader><CardTitle className="text-lg">Canal WhatsApp</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">Canal WhatsApp</CardTitle>
          {saved && <Badge variant="success">Salvo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure os dados da Meta Cloud API. Obtenha-os no{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">
                Meta Developer Portal
              </a>.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="wa-webhook-url">Webhook URL (copiar na Meta)</Label>
                <Input id="wa-webhook-url" value={WHATSAPP_WEBHOOK_URL} readOnly className="font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="wa-verify-fixed">Verify Token (copiar na Meta)</Label>
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
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={channel.status === "active" ? <Badge variant="success">Ativo</Badge> : <Badge variant="warning">Desativado</Badge>} />
            <InfoRow label="Webhook URL" value={<span className="font-mono text-xs">{WHATSAPP_WEBHOOK_URL}</span>} />
            <InfoRow label="Verify Token" value={<span className="font-mono text-xs">{WHATSAPP_VERIFY_TOKEN}</span>} />
            <InfoRow label="Phone Number ID" value={<span className="font-mono text-xs">{channel.phoneNumberId}</span>} />
            <InfoRow label="WABA ID" value={<span className="font-mono text-xs">{channel.wabaId}</span>} />
            <InfoRow label="Configurado em" value={formatDate(channel.createdAt)} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
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
  const channel = useQuery(
    api.dashboard.getTelegramChannel,
    tenantId ? { tenantId: tenantId as any } : "skip",
  );
  const upsert = useMutation(api.telegramChannels.upsert);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    setForm((f) => ({ ...f, webhookSecret: secret }));
  };

  const handleSave = async () => {
    if (!form.botToken.trim() || !form.botUsername.trim() || !form.webhookSecret.trim()) return;
    setSaving(true);
    try {
      const groupId = form.operatorGroupChatId.trim();
      await upsert({
        tenantId: tenantId as any,
        botToken: form.botToken.trim(),
        botUsername: form.botUsername.trim().replace(/^@/, ""),
        webhookSecret: form.webhookSecret.trim(),
        ...(groupId.length > 0 ? { operatorGroupChatId: Number(groupId) } : {}),
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
        <CardHeader><CardTitle className="text-lg">Canal Telegram</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">Canal Telegram</CardTitle>
          {saved && <Badge variant="success">Salvo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crie um bot no{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
                @BotFather
              </a>{" "}
              do Telegram e preencha os dados abaixo.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tg-token">Bot Token</Label>
                <Input id="tg-token" type="password" value={form.botToken} onChange={(e) => setForm((f) => ({ ...f, botToken: e.target.value }))} placeholder="Ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
              </div>
              <div>
                <Label htmlFor="tg-username">Bot Username (sem @)</Label>
                <Input id="tg-username" value={form.botUsername} onChange={(e) => setForm((f) => ({ ...f, botUsername: e.target.value }))} placeholder="Ex: meu_bot" />
              </div>
              <div>
                <Label htmlFor="tg-secret">Webhook Secret</Label>
                <div className="flex gap-2">
                  <Input id="tg-secret" value={form.webhookSecret} onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))} placeholder="Token secreto para validar webhooks" className="flex-1" />
                  <Button variant="outline" size="sm" onClick={generateSecret} type="button">
                    Gerar
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="tg-operator-group">ID do Grupo de Operadores (opcional)</Label>
                <Input id="tg-operator-group" value={form.operatorGroupChatId} onChange={(e) => setForm((f) => ({ ...f, operatorGroupChatId: e.target.value }))} placeholder="Ex: -1001234567890" />
                <p className="text-xs text-muted-foreground mt-1">
                  Chat ID do grupo Telegram onde operadores recebem mensagens de handoff. Adicione o bot ao grupo e use /start para obter o ID.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Após salvar, registre o webhook executando:{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                node --experimental-strip-types --env-file=.env.local scripts/setupTelegramWebhook.ts
              </code>
            </p>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={channel.status === "active" ? <Badge variant="success">Ativo</Badge> : <Badge variant="warning">Desativado</Badge>} />
            <InfoRow label="Bot" value={<span className="font-mono text-xs">@{channel.botUsername}</span>} />
            {channel.operatorGroupChatId && (
              <InfoRow label="Grupo Operadores" value={<span className="font-mono text-xs">{channel.operatorGroupChatId}</span>} />
            )}
            <InfoRow label="Configurado em" value={formatDate(channel.createdAt)} />
            {channel.updatedAt !== channel.createdAt && (
              <InfoRow label="Atualizado em" value={formatDate(channel.updatedAt)} />
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
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
        <CardHeader><CardTitle className="text-lg">Integração Bokun</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">Integração Bokun</CardTitle>
          {saved && <Badge variant="success">Salvo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure as credenciais da API Bokun. Para marketplace, use o fluxo OAuth abaixo. Para desenvolvimento, insira as chaves manualmente.
            </p>

            {/* Manual config form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="bokun-url">Base URL</Label>
                <Input id="bokun-url" value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.bokun.io" />
              </div>
              <div>
                <Label htmlFor="bokun-access">Access Key</Label>
                <Input id="bokun-access" type="password" value={form.accessKey} onChange={(e) => setForm((f) => ({ ...f, accessKey: e.target.value }))} placeholder="Chave de acesso da API Bokun" />
              </div>
              <div>
                <Label htmlFor="bokun-secret">Secret Key</Label>
                <Input id="bokun-secret" type="password" value={form.secretKey} onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))} placeholder="Chave secreta da API Bokun" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={<Badge variant="success">Conectado</Badge>} />
            <InfoRow label="Base URL" value={<span className="font-mono text-xs">{installation.baseUrl}</span>} />
            <InfoRow label="Escopos" value={installation.scopes?.join(", ") ?? "-"} />
            <InfoRow label="Conectado em" value={formatDate(installation.createdAt)} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Reconectar
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
            <CardTitle className="text-lg">Código de Convite</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Compartilhe este código para convidar membros da equipe.
            </p>
            {tenantInfo?.inviteCode ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-md bg-muted px-4 py-2.5 font-mono text-lg tracking-widest text-center">
                  {tenantInfo.inviteCode}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateCode}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerar
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateCode}>
                Gerar código de convite
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Membros da Equipe</CardTitle>
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
                Nenhum membro encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium">
                            {m.name ?? "Sem nome"}
                          </span>
                          {m.email && (
                            <span className="block text-xs text-muted-foreground">
                              {m.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{roleLabel(m.role)}</TableCell>
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
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{confirmRemove?.email ?? "este membro"}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── IA (OpenAI) Tab ─── */

function IATab({ tenantId }: { tenantId: string }) {
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
        <CardHeader><CardTitle className="text-lg">Inteligência Artificial</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">Inteligência Artificial</CardTitle>
          {saved && <Badge variant="success">Salvo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure sua chave da API OpenAI para habilitar o assistente de IA.
              Obtenha uma chave em{" "}
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
                <Label htmlFor="openai-model">Modelo</Label>
                <select
                  id="openai-model"
                  value={form.openaiModel}
                  onChange={(e) => setForm((f) => ({ ...f, openaiModel: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (recomendado)</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  O GPT-4o Mini oferece o melhor custo-benefício. Modelos maiores são mais capazes mas custam mais.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Status" value={<Badge variant="success">Configurado</Badge>} />
            <InfoRow label="API Key" value={<span className="font-mono text-xs">{settings.maskedKey}</span>} />
            <InfoRow label="Modelo" value={settings.openaiModel ?? "gpt-4o-mini"} />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
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
  const profile = useQuery(api.tenants.getTenantProfile, { tenantId: tenantId as any });
  const updateProfile = useMutation(api.tenants.updateTenantProfile);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        <CardHeader><CardTitle className="text-lg">Perfil da Empresa</CardTitle></CardHeader>
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
          <CardTitle className="text-lg">Perfil da Empresa</CardTitle>
          {saved && <Badge variant="success">Salvo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure as informações da sua empresa e preferências do bot.
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="perfil-name">Nome da Empresa</Label>
              <Input
                id="perfil-name"
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                placeholder="Ex: Sondevela Barcelona"
              />
            </div>
            <div>
              <Label htmlFor="perfil-logo">URL do Logotipo</Label>
              <Input
                id="perfil-logo"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="perfil-email">Email de Contacto</Label>
              <Input
                id="perfil-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="perfil-tz">Fuso Horário</Label>
              <select
                id="perfil-tz"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Europe/Lisbon">Europe/Lisbon (Portugal)</option>
                <option value="Europe/Madrid">Europe/Madrid (Espanha)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (Brasil)</option>
                <option value="America/New_York">America/New_York (EUA - Leste)</option>
                <option value="Europe/London">Europe/London (Reino Unido)</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Usado para formatar horários de disponibilidade nas mensagens WhatsApp.
              </p>
            </div>
            <div>
              <Label htmlFor="perfil-lang">Idioma do Bot</Label>
              <select
                id="perfil-lang"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="pt">Português (PT)</option>
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Idioma padrão do assistente IA. O bot adapta-se ao idioma do cliente se for diferente.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Assinatura Tab ─── */

function AssinaturaTab({ tenantId }: { tenantId: string }) {
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
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
      const res = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, tenantId }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? "Erro ao iniciar checkout");
      }
    } catch {
      setCheckoutError("Falha de rede. Tente novamente.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Ativo</Badge>;
      case "trialing":
        return <Badge variant="default" className="bg-blue-500">Em teste</Badge>;
      case "past_due":
        return <Badge variant="warning">Pagamento pendente</Badge>;
      case "canceled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Sem plano</Badge>;
    }
  };

  if (profile === undefined) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Assinatura</CardTitle></CardHeader>
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
          Assinatura ativada com sucesso! Obrigado por assinar o Bokun Bot.
        </div>
      )}
      {checkoutState === "cancelled" && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Checkout cancelado. Pode tentar novamente quando quiser.
        </div>
      )}

      {/* Current plan status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Estado" value={statusLabel(profile?.stripeStatus ?? null)} />
          {profile?.stripeCurrentPeriodEnd && (
            <InfoRow
              label={profile?.stripeStatus === "trialing" ? "Fim do período de teste" : "Próxima fatura"}
              value={new Date(profile.stripeCurrentPeriodEnd * 1000).toLocaleDateString("pt-BR")}
            />
          )}
          {profile?.stripeSubscriptionId && (
            <InfoRow
              label="ID da Assinatura"
              value={
                <span className="font-mono text-xs">
                  ...{profile.stripeSubscriptionId.slice(-8)}
                </span>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Plan selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escolher Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Monthly plan */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="font-semibold text-lg">Mensal</p>
                <p className="text-2xl font-bold mt-1">€29<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleCheckout("monthly")}
                disabled={loadingCheckout}
              >
                Começar teste grátis (7 dias)
              </Button>
            </div>

            {/* Annual plan */}
            <div className="rounded-lg border border-primary p-4 space-y-3 relative">
              <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">Recomendado</Badge>
              <div>
                <p className="font-semibold text-lg">Anual</p>
                <p className="text-2xl font-bold mt-1">€290<span className="text-sm font-normal text-muted-foreground">/ano</span></p>
                <p className="text-xs text-green-600 mt-1">Poupa ~2 meses vs. mensal</p>
              </div>
              <Button
                className="w-full"
                onClick={() => handleCheckout("annual")}
                disabled={loadingCheckout}
              >
                Começar teste grátis (7 dias)
              </Button>
            </div>
          </div>

          {checkoutError && (
            <p className="mt-3 text-sm text-destructive">{checkoutError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Main Page ─── */

const SettingsPage = () => {
  const { tenantId } = useTenant();
  const { t } = useI18n();
  const [tab, setTab] = useState("whatsapp");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

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
