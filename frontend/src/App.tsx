import { useConvexAuth } from "convex/react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import LandingPage from "./pages/LandingPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import BookingsPage from "./pages/BookingsPage";
import ConversationsPage from "./pages/ConversationsPage";
import ConversationDetailPage from "./pages/ConversationDetailPage";
import SettingsPage from "./pages/SettingsPage";
import OperatorInboxPage from "./pages/OperatorInboxPage";
import FailedWebhooksPage from "./pages/FailedWebhooksPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import { useTenant } from "./hooks/useTenant";
import { useI18n } from "./i18n";

const Spinner = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium animate-pulse">{t("common.loadingSync")}</p>
      </div>
    </div>
  );
};

// Guard: exige autenticação, mostra spinner enquanto carrega
function RequireAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

// Guard: exige tenant configurado, redireciona para onboarding se não tiver
function RequireTenant() {
  const { hasTenant, isLoading } = useTenant();
  if (isLoading) return <Spinner />;
  if (!hasTenant) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// Rota pública de auth:
// - visitante vê a tela de login
// - usuário autenticado é redirecionado automaticamente
function AuthRoute() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { hasTenant, isLoading: tenantLoading } = useTenant();

  if (authLoading || (isAuthenticated && tenantLoading)) return <Spinner />;
  if (!isAuthenticated) return <Auth />;
  return <Navigate to={hasTenant ? "/overview" : "/onboarding"} replace />;
}

function App() {
  const { isLoading } = useConvexAuth();

  // Só bloqueia enquanto a sessão inicial carrega (evita flash de /auth)
  if (isLoading) return <Spinner />;

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfUsePage />} />

      {/* Rotas protegidas: exigem autenticação */}
      <Route element={<RequireAuth />}>
        {/* Onboarding: autenticado mas sem tenant */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Dashboard: autenticado E com tenant */}
        <Route element={<RequireTenant />}>
          <Route element={<DashboardLayout />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/reservas" element={<BookingsPage />} />
            <Route path="/conversas" element={<ConversationsPage />} />
            <Route
              path="/conversas/:waUserId"
              element={<ConversationDetailPage />}
            />
            <Route path="/webhooks" element={<FailedWebhooksPage />} />
            <Route path="/atendimento" element={<OperatorInboxPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
