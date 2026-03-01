import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

const ConversationDetailPage = () => {
  const { waUserId } = useParams<{ waUserId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const messages = useQuery(
    api.dashboard.getChatHistory,
    tenantId && waUserId
      ? { tenantId, waUserId: decodeURIComponent(waUserId) }
      : "skip",
  );

  const sortedMessages = messages ? [...messages].reverse() : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/conversas")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          Conversa{" "}
          <span className="font-mono text-base text-muted-foreground">
            ...{waUserId?.slice(-8)}
          </span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMessages === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-3/4" />
              ))}
            </div>
          ) : sortedMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma mensagem encontrada.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-auto">
              {sortedMessages.map((msg) => {
                const isUser = msg.role === "user";
                const isSystem = msg.role === "system" || msg.role === "tool";

                if (isSystem) return null;

                return (
                  <div
                    key={msg._id}
                    className={cn(
                      "flex",
                      isUser ? "justify-start" : "justify-end",
                    )}
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
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationDetailPage;
