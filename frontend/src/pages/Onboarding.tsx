import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeyRound, LogOut, Building2, PlusCircle } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const Onboarding = () => {
  const { hasTenant, isLoading: isTenantLoading } = useTenant();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const joinByInviteCode = useMutation(api.userTenants.joinByInviteCode);
  const createAndJoinTenant = useMutation(api.userTenants.createAndJoinTenant);

  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [inviteCode, setInviteCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSessionReady = !isAuthLoading && isAuthenticated;

  useEffect(() => {
    if (!isTenantLoading && hasTenant) {
      navigate("/reservas", { replace: true });
    }
  }, [isTenantLoading, hasTenant, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSessionReady) {
      setError("Sessão ainda sincronizando. Aguarde alguns segundos e tente novamente.");
      return;
    }
    setLoading(true);

    try {
      await joinByInviteCode({ inviteCode });
      // Redirecionamento será tratado pelo useEffect
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes("inválido") || raw.includes("invalid")) {
        setError("Código de convite inválido. Verifique e tente novamente.");
      } else if (raw.includes("já está vinculado")) {
        setError("Você já está vinculado a uma empresa.");
      } else {
        setError("Erro ao vincular empresa. Tente novamente.");
      }
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSessionReady) {
      setError("Sessão ainda sincronizando. Aguarde alguns segundos e tente novamente.");
      return;
    }
    setLoading(true);

    try {
      await createAndJoinTenant({ name: tenantName });
      // Redirecionamento será tratado pelo useEffect
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw.includes("vinculado") ? "Você já está vinculado a uma empresa." : "Erro ao criar empresa. Tente novamente.");
      setLoading(false);
    }
  };

  if (isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasTenant) {
    return null; // O useEffect cuidará do redirecionamento
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bokun WhatsApp Bot
          </h1>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {mode === "select" && "Bem-vindo"}
              {mode === "create" && "Criar nova empresa"}
              {mode === "join" && "Vincular empresa"}
            </CardTitle>
            <CardDescription>
              {mode === "select" && "Configure sua conta para começar a gerenciar seu bot WhatsApp"}
              {mode === "create" && "Comece definindo o nome da sua organização"}
              {mode === "join" && "Digite o código de convite recebido no Bokun marketplace"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {mode === "select" && (
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={() => setMode("create")}
                  disabled={!isSessionReady}
                >
                  <PlusCircle className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-base">Nova empresa</span>
                    <span className="text-xs text-muted-foreground font-normal">Eu sou um novo vendor</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={() => setMode("join")}
                  disabled={!isSessionReady}
                >
                  <KeyRound className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-base">Já tenho um código</span>
                    <span className="text-xs text-muted-foreground font-normal">Vincular a uma empresa existente</span>
                  </div>
                </Button>
              </div>
            )}

            {mode === "create" && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Nome da Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tenantName"
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="pl-10 h-12"
                      placeholder="Ex: Minha Agência de Turismo"
                      required
                      disabled={loading || !isSessionReady}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setMode("select")} disabled={loading} className="px-6 h-12">
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1 h-12" disabled={loading || !isSessionReady}>
                    {loading ? "Criando..." : "Criar Empresa"}
                  </Button>
                </div>
              </form>
            )}

            {mode === "join" && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Código de convite</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) =>
                        setInviteCode(e.target.value.toUpperCase())
                      }
                      className="pl-10 h-12 uppercase tracking-widest font-mono"
                      placeholder="XXXXXXXX"
                      required
                      maxLength={8}
                      disabled={loading || !isSessionReady}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setMode("select")} disabled={loading} className="px-6 h-12">
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12"
                    disabled={loading || inviteCode.length < 4 || !isSessionReady}
                  >
                    {loading ? "Vinculando..." : "Vincular Empresa"}
                  </Button>
                </div>
              </form>
            )}

            {!isSessionReady && (
              <p className="text-sm text-muted-foreground text-center">
                Sincronizando sessão segura...
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="text-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
