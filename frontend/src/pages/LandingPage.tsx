import { Clock, Plug, TrendingUp, LayoutDashboard } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-lg font-bold text-slate-900">Bokun Bot</span>
          <a
            href="/auth"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Entrar
          </a>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section
          id="hero"
          className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 max-w-3xl mx-auto leading-tight">
              Converta conversas do WhatsApp em reservas confirmadas no Bokun.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              Instale uma vez, conecte seu WhatsApp e deixe o bot capturar
              horário, pickup e participantes — com confirmação e logs.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href="https://apps.bokun.io"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors text-center"
              >
                Começar teste grátis
              </a>
              <button
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto border border-slate-300 text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
              >
                Ver como funciona
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
              Por que usar o Bokun Bot?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: 24/7 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Reservas 24/7 no WhatsApp
                </h3>
                <p className="text-sm text-slate-600">
                  Bot atende clientes a qualquer hora, sem agente humano
                  disponível.
                </p>
              </div>

              {/* Card 2: Native Integration */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <Plug className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Integração nativa com Bokun
                </h3>
                <p className="text-sm text-slate-600">
                  Instala via marketplace, sem configuração técnica.
                </p>
              </div>

              {/* Card 3: Conversion */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Menos erros, mais conversão
                </h3>
                <p className="text-sm text-slate-600">
                  Fluxo guiado captura horário, pickup e participantes com
                  precisão.
                </p>
              </div>

              {/* Card 4: Control */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <LayoutDashboard className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Controle e auditoria
                </h3>
                <p className="text-sm text-slate-600">
                  Dashboard com logs de conversa, lista de reservas e retry de
                  webhooks falhos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">
              Preços simples e transparentes
            </h2>
            <p className="text-slate-600 text-center mb-12 text-base">
              Comece com 7 dias grátis — sem cartão de crédito.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Monthly Plan */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Mensal
                </h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900">€29</span>
                  <span className="text-slate-500 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                  7 dias grátis incluídos
                </p>
                <ul className="space-y-2 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Todas as funcionalidades
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Dashboard completo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Suporte via email
                  </li>
                </ul>
                <a
                  href="/api/create-checkout-session?plan=monthly"
                  className="w-full text-center bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Começar teste grátis
                </a>
              </div>

              {/* Annual Plan — Highlighted */}
              <div className="relative bg-white rounded-xl p-8 shadow-sm border border-slate-200 ring-2 ring-green-500 flex flex-col">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Recomendado
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  Anual
                </h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900">
                    €290
                  </span>
                  <span className="text-slate-500 mb-1">/ano</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    ≈ 2 meses grátis
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                  7 dias grátis incluídos
                </p>
                <ul className="space-y-2 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Todas as funcionalidades
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Dashboard completo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Suporte via email
                  </li>
                </ul>
                <a
                  href="/api/create-checkout-session?plan=annual"
                  className="w-full text-center bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Começar teste grátis
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
            &copy; 2024 Bokun Bot. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
