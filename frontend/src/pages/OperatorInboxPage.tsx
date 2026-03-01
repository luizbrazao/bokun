import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Send, X, Headset } from "lucide-react";

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

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function channelLabel(ch: string) {
  return ch === "tg" ? "Telegram" : "WhatsApp";
}

/* ─── Conversation List (left panel) ─── */

function ConversationList({
  handoffs,
  selectedUserId,
  onSelect,
}: {
  handoffs: any[] | undefined;
  selectedUserId: string | null;
  onSelect: (waUserId: string) => void;
}) {
  if (handoffs === undefined) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (handoffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <Headset className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm text-center">
          Nenhum atendimento ativo no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y overflow-auto">
      {handoffs.map((h) => (
        <button
          key={h._id}
          onClick={() => onSelect(h.waUserId)}
          className={cn(
            "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
            selectedUserId === h.waUserId && "bg-primary/5 border-l-2 border-primary",
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs font-medium">
              ...{h.waUserId.slice(-8)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(h.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {channelLabel(h.handoffChannel)}
            </Badge>
            {h.lastMessage && (
              <span className="text-xs text-muted-foreground truncate flex-1">
                {h.lastMessage.role === "user" ? "" : "Operador: "}
                {h.lastMessage.content}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Chat Panel (right panel) ─── */

function ChatPanel({
  tenantId,
  waUserId,
  onResolved,
}: {
  tenantId: string;
  waUserId: string;
  onResolved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.dashboard.getChatHistory,
    { tenantId: tenantId as any, waUserId, limit: 100 },
  );
  const sendMessage = useAction(api.operatorInbox.sendOperatorMessage);
  const resolveHandoff = useAction(api.operatorInbox.resolveHandoff);

  const sortedMessages = messages ? [...messages].reverse() : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages?.length]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessage({
        tenantId: tenantId as any,
        waUserId,
        text,
      });
      setMessage("");
    } catch (err) {
      console.error("Erro ao enviar:", err);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await resolveHandoff({
        tenantId: tenantId as any,
        waUserId,
      });
      onResolved();
    } catch (err) {
      console.error("Erro ao encerrar:", err);
    } finally {
      setResolving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <span className="font-mono text-sm font-medium">
            ...{waUserId.slice(-8)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResolve}
          disabled={resolving}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4 mr-1" />
          {resolving ? "Encerrando..." : "Encerrar atendimento"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {sortedMessages === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-3/4" />
            ))}
          </div>
        ) : sortedMessages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            Nenhuma mensagem encontrada.
          </p>
        ) : (
          sortedMessages.map((msg) => {
            const isUser = msg.role === "user";
            const isSystem = msg.role === "system" || msg.role === "tool";
            if (isSystem) return null;

            return (
              <div
                key={msg._id}
                className={cn("flex", isUser ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                    isUser
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      isUser
                        ? "text-muted-foreground"
                        : "text-primary-foreground/70",
                    )}
                  >
                    {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

const OperatorInboxPage = () => {
  const { tenantId } = useTenant();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handoffs = useQuery(
    api.dashboard.listActiveHandoffs,
    tenantId ? { tenantId } : "skip",
  );

  const handleResolved = () => {
    setSelectedUserId(null);
  };

  // Auto-deselect if the selected user is no longer in active handoffs
  useEffect(() => {
    if (
      selectedUserId &&
      handoffs &&
      !handoffs.some((h) => h.waUserId === selectedUserId)
    ) {
      setSelectedUserId(null);
    }
  }, [handoffs, selectedUserId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Atendimento</h1>
        {handoffs && handoffs.length > 0 && (
          <Badge variant="default">{handoffs.length} ativo{handoffs.length !== 1 ? "s" : ""}</Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-12rem)] min-h-[500px]">
          {/* Left: conversation list */}
          <div className="w-80 border-r flex-shrink-0 flex flex-col">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm">Conversas em atendimento</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-auto">
              <ConversationList
                handoffs={handoffs}
                selectedUserId={selectedUserId}
                onSelect={setSelectedUserId}
              />
            </div>
          </div>

          {/* Right: chat panel */}
          <div className="flex-1 flex flex-col">
            {selectedUserId && tenantId ? (
              <ChatPanel
                tenantId={tenantId}
                waUserId={selectedUserId}
                onResolved={handleResolved}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Headset className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {handoffs && handoffs.length > 0
                      ? "Selecione uma conversa para atender"
                      : "Aguardando atendimentos..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OperatorInboxPage;
