import { useEffect, useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useI18n } from "@/i18n";

const BRAND_LOGO_SRC = "/chatplug-newlogo.svg";

function friendlyAuthError(
  raw: string,
  isSignUp: boolean,
  t: (key: string) => string,
): string {
  const lower = raw.toLowerCase();

  if (lower.includes("invalidsecret") || lower.includes("invalid secret")) {
    return t("auth.errorWrongPassword");
  }
  if (
    lower.includes("invalidaccountid") ||
    lower.includes("could not find account") ||
    lower.includes("invalid credentials")
  ) {
    return t("auth.errorEmailNotFound");
  }
  if (
    lower.includes("account already exists") ||
    lower.includes("accountalreadyexists")
  ) {
    return t("auth.errorEmailExists");
  }
  if (lower.includes("invalid email") || lower.includes("invalidemail")) {
    return t("auth.errorInvalidEmail");
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return t("auth.errorRateLimit");
  }
  if (lower.includes("cannot read properties of null")) {
    return t("auth.errorInternal");
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return t("auth.errorNetwork");
  }

  return isSignUp
    ? t("auth.errorSignup")
    : t("auth.errorSignin");
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
    />
    <path
      fill="#34A853"
      d="M2 12c0 1.6.4 3.1 1.2 4.4l3.4-2.6c-.2-.5-.4-1.1-.4-1.8s.1-1.2.4-1.8L3.2 7.6A9.9 9.9 0 0 0 2 12z"
    />
    <path
      fill="#4A90E2"
      d="M12 22c2.7 0 5-0.9 6.7-2.4l-3.2-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1l-3.5 2.7C4.6 19.8 8 22 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.4-1.9L3 7.4A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4l3.3-2.5z"
    />
  </svg>
);

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  icon,
  disabled,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  icon?: "mail" | "lock" | "user";
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#617977]">
            {icon === "mail" && <Mail size={15} />}
            {icon === "lock" && <Lock size={15} />}
            {icon === "user" && <User size={15} />}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-12 w-full rounded-xl border border-[#d9d4c9] bg-[#f7f4f0] pl-11 pr-3 text-base text-[#062427] placeholder:text-[#708885] outline-none transition focus:border-[#9db8a8]"
        />
      </div>
    </div>
  );
}

export default function Auth() {
  const { t } = useI18n();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { hasTenant, isLoading: tenantLoading } = useTenant();

  const modeFromUrl = searchParams.get("mode");
  const initialIsSignUp = useMemo(
    () => modeFromUrl === "signup" || modeFromUrl === "signUp",
    [modeFromUrl],
  );

  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading || oauthLoading || awaitingSession;

  useEffect(() => {
    setIsSignUp(initialIsSignUp);
    setError(null);
  }, [initialIsSignUp]);

  const inviteFromUrl = searchParams.get("invite") ?? "";

  useEffect(() => {
    if (!awaitingSession) return;
    if (authLoading || tenantLoading) return;
    if (!isAuthenticated) return;
    if (hasTenant) {
      navigate("/reservas", { replace: true });
    } else {
      // Pass invite code through to onboarding if present
      const target = inviteFromUrl
        ? `/onboarding?invite=${encodeURIComponent(inviteFromUrl)}`
        : "/onboarding";
      navigate(target, { replace: true });
    }
  }, [
    awaitingSession,
    authLoading,
    tenantLoading,
    isAuthenticated,
    hasTenant,
    navigate,
    inviteFromUrl,
  ]);

  useEffect(() => {
    if (!awaitingSession) return;
    const timeout = window.setTimeout(() => {
      if (!isAuthenticated) {
        setAwaitingSession(false);
        setError(
          t("auth.errorSessionPending"),
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
        setError(t("auth.errorPasswordMismatch"));
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
        setError(t("auth.errorLoginNow"));
        return;
      }
      setAwaitingSession(true);
    } catch (err) {
      setAwaitingSession(false);
      const raw = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(raw, isSignUp, t));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setOauthLoading(true);
    setAwaitingSession(false);

    try {
      const result = await signIn("google", { redirectTo: "/overview" });
      if (result.signingIn) setAwaitingSession(true);
    } catch (err) {
      setAwaitingSession(false);
      const raw = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(raw, false, t));
    } finally {
      setOauthLoading(false);
    }
  };

  const switchMode = (nextIsSignUp: boolean) => {
    setIsSignUp(nextIsSignUp);
    setSearchParams(nextIsSignUp ? { mode: "signup" } : { mode: "signin" });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f4f0] overflow-y-auto relative isolate">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-55"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(6,36,39,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,36,39,0.08) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute left-2 top-4 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-xs font-medium text-[#062427] shadow-none outline-none hover:opacity-75 md:left-4 md:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.backToHome")}
      </button>

      <div className="min-h-screen flex items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-[500px]">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-0 py-0">
              <img src={BRAND_LOGO_SRC} alt="ChatPlug" className="h-10 w-auto object-contain" />
            </div>
          </div>

          <form
            onSubmit={handleEmailAuth}
            className="rounded-3xl border border-[#d9d4c9] bg-white/85 shadow-[0_18px_36px_rgba(6,36,39,0.10)] backdrop-blur-sm px-5 py-6 md:px-6 md:py-7 space-y-4"
          >
            <header className="text-center space-y-1.5">
              <h1 className="font-display text-5xl leading-none font-semibold tracking-tight text-[#062427] mt-3">
                {isSignUp ? t("auth.startFree") : t("auth.welcomeBack")}
              </h1>
              <p className="text-xs text-[#4f6462]">
                {isSignUp
                  ? t("auth.subtitleSignup")
                  : t("auth.subtitleSignin")}
              </p>
            </header>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isBusy || authLoading}
              className="w-full rounded-xl border border-[#d9d4c9] bg-[#f7f4f0] py-2.5 text-sm font-semibold text-[#062427] flex items-center justify-center gap-2.5 hover:bg-[#efeae1] transition-all disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5" />
              {oauthLoading
                ? t("auth.connectingGoogle")
                : authLoading
                  ? t("auth.loadingSession")
                  : t("auth.continueWithGoogle")}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[#d9d4c9]" />
              <span className="text-xs text-[#657a78]">{t("auth.or")}</span>
              <div className="h-px flex-1 bg-[#d9d4c9]" />
            </div>

            {isSignUp && (
              <div className="grid grid-cols-2 gap-2.5">
                <Field
                  label={t("auth.firstName")}
                  value={firstName}
                  onChange={setFirstName}
                  placeholder={t("auth.placeholderFirstName")}
                  required
                  icon="user"
                  disabled={isBusy || authLoading}
                  autoComplete="given-name"
                />
                <Field
                  label={t("auth.lastName")}
                  value={lastName}
                  onChange={setLastName}
                  placeholder={t("auth.placeholderLastName")}
                  required
                  icon="user"
                  disabled={isBusy || authLoading}
                  autoComplete="family-name"
                />
              </div>
            )}

            <Field
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={t("auth.placeholderEmail")}
              required
              icon="mail"
              disabled={isBusy || authLoading}
              autoComplete={isSignUp ? "username" : "email"}
            />

            <Field
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t("auth.placeholderPassword")}
              required
              icon="lock"
              disabled={isBusy || authLoading}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />

            {isSignUp && (
              <Field
                label={t("auth.confirmPassword")}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t("auth.placeholderConfirmPassword")}
                required
                icon="lock"
                disabled={isBusy || authLoading}
                autoComplete="new-password"
              />
            )}

            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs font-semibold text-[#062427] underline decoration-[#d4ff3f] underline-offset-2 hover:opacity-80"
                  onClick={() =>
                    window.alert(
                      t("auth.resetNotImplemented"),
                    )
                  }
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy || authLoading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-[#f7f4f0] bg-[#062427] hover:brightness-110 transition-all disabled:opacity-60"
            >
              {awaitingSession
                ? t("auth.validatingSession")
                : loading
                  ? isSignUp
                    ? t("auth.creatingAccount")
                    : t("auth.loggingIn")
                  : isSignUp
                    ? t("auth.startFreeTrial")
                    : t("auth.signin")}
            </button>

            <div className="text-center text-sm">
              {isSignUp ? (
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className="text-sm font-semibold text-[#062427] underline decoration-[#d4ff3f] underline-offset-2 hover:opacity-80"
                  disabled={isBusy || authLoading}
                >
                  {t("auth.alreadyHaveAccountSignin")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className="text-sm font-semibold text-[#062427] underline decoration-[#d4ff3f] underline-offset-2 hover:opacity-80"
                  disabled={isBusy || authLoading}
                >
                  {t("auth.noAccountStartTrial")}
                </button>
              )}
            </div>

            {isSignUp && (
              <p className="text-center text-[11px] text-[#627775]">
                {t("auth.passwordPolicy")}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
