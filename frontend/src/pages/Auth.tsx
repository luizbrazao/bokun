import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";

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
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User } from "lucide-react";

function friendlyAuthError(raw: string, isSignUp: boolean): string {
  const lower = raw.toLowerCase();

  if (lower.includes("invalidsecret") || lower.includes("invalid secret")) {
    return "Senha incorreta. Verifique e tente novamente.";
  }
  if (
    lower.includes("invalidaccountid") ||
    lower.includes("could not find account") ||
    lower.includes("invalid credentials")
  ) {
    return "E-mail não encontrado. Verifique ou crie uma conta.";
  }
  if (
    lower.includes("account already exists") ||
    lower.includes("accountalreadyexists")
  ) {
    return "Este e-mail já está cadastrado. Faça login.";
  }
  if (lower.includes("invalid email") || lower.includes("invalidemail")) {
    return "E-mail inválido. Verifique o formato.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (lower.includes("cannot read properties of null")) {
    return "Erro interno de autenticação. Tente novamente ou use outro e-mail.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  if (
    lower.includes("localstorage") ||
    lower.includes("sessionstorage") ||
    lower.includes("quotaexceeded")
  ) {
    return "O navegador bloqueou o armazenamento da sessão. Desative bloqueadores/privacidade para este site e tente novamente.";
  }

  return isSignUp
    ? "Erro ao criar conta. Tente novamente."
    : "Erro ao fazer login. Tente novamente.";
}

const Auth = () => {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { hasTenant, isLoading: tenantLoading } = useTenant();

  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const isBusy = loading || oauthLoading || awaitingSession;

  useEffect(() => {
    if (!awaitingSession) return;
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (tenantLoading) return;

    navigate(hasTenant ? "/reservas" : "/onboarding", { replace: true });
  }, [
    awaitingSession,
    authLoading,
    isAuthenticated,
    tenantLoading,
    hasTenant,
    navigate,
  ]);

  useEffect(() => {
    if (!awaitingSession) return;
    const timeout = window.setTimeout(() => {
      if (!isAuthenticated) {
        setAwaitingSession(false);
        setError(
          "Sessão criada, mas ainda não confirmada no Convex. Aguarde alguns segundos e tente novamente.",
        );
      }
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [awaitingSession, isAuthenticated]);

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp && password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const result = await signIn("password", {
        email: normalizedEmail,
        password,
        flow: isSignUp ? "signUp" : "signIn",
        ...(isSignUp && { name: `${firstName} ${lastName}`.trim() }),
      });

      if (!result.signingIn) {
        setError("Não foi possível concluir o login agora. Tente novamente.");
        return;
      }
      setAwaitingSession(true);
    } catch (err) {
      setAwaitingSession(false);
      const raw = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(raw, isSignUp));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setOauthLoading(true);
    setAwaitingSession(false);

    try {
      const result = await signIn("google");
      if (result.signingIn) {
        setAwaitingSession(true);
      }
    } catch (err) {
      setAwaitingSession(false);
      const raw = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(raw, false));
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bokun WhatsApp Bot
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel de gestão para operadores
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Cadastre-se para gerenciar seu bot WhatsApp"
                : "Faça login no seu painel"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              className="w-full h-12 text-base font-medium"
              disabled={isBusy || authLoading}
            >
              <svg
                className="h-5 w-5 mr-3"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.85z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.46 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A11.99 11.99 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.29V6.62H1.28A11.99 11.99 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.99-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.09 15.24 0 12 0A11.99 11.99 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
              {oauthLoading
                ? "Conectando com Google..."
                : authLoading
                  ? "Carregando sessão..."
                  : "Continuar com Google"}
            </Button>

            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">
                  ou
                </span>
              </div>
            </div>

            <form ref={formRef} onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 h-12"
                        placeholder="Seu nome"
                        autoComplete="given-name"
                        required
                        disabled={isBusy || authLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10 h-12"
                        placeholder="Seu sobrenome"
                        autoComplete="family-name"
                        required
                        disabled={isBusy || authLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    placeholder="Digite seu e-mail"
                    autoComplete={isSignUp ? "username" : "email"}
                    required
                    disabled={isBusy || authLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    placeholder="Digite sua senha"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    disabled={isBusy || authLoading}
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-12"
                      placeholder="Confirme sua senha"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={isBusy || authLoading}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isBusy || authLoading}
              >
                {awaitingSession
                  ? "Validando sessão..."
                  : loading
                  ? "Aguarde..."
                  : isSignUp
                    ? "Criar conta"
                    : "Entrar"}
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </form>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm text-primary hover:text-primary/80 font-medium"
                disabled={isBusy || authLoading}
              >
                {isSignUp
                  ? "Já tem uma conta? Entre"
                  : "Não tem uma conta? Cadastre-se"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
