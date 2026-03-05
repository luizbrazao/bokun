import {
  CalendarCheck2,
  MessageCircleMore,
  ShieldCheck,
  Workflow,
} from "lucide-react";

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
              Automatize atendimento e agendamentos do seu Bokun no WhatsApp e
              Telegram.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              Conecte seus canais em minutos e transforme mensagens em reservas
              com menos trabalho manual. Teste por 7 dias, sem cartão de
              crédito.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href="https://apps.bokun.io"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors text-center"
              >
                Testar grátis por 7 dias
              </a>
              <a
                href="#integracao"
                className="w-full sm:w-auto border border-slate-300 text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-lg font-semibold text-base transition-colors text-center"
              >
                Conectar Bokun ao WhatsApp ou Telegram
              </a>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Sem cartão de crédito
            </p>
          </div>
        </section>

        {/* Problem + Solution */}
        <section id="problema" className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Sua operação perde tempo onde não deveria.
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Se sua equipe responde mensagens manualmente o dia inteiro, você
                já conhece o custo: atraso no atendimento, respostas
                inconsistentes e oportunidades perdidas de reserva.
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                O Bokun continua no centro da operação. Nós automatizamos o que
                é repetitivo no WhatsApp e Telegram para sua equipe focar no
                que realmente precisa de atenção humana.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
              Um fluxo de reservas mais inteligente nos canais que seu cliente
              já usa
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <MessageCircleMore className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Atendimento mais rápido
                </h3>
                <p className="text-sm text-slate-600">
                  Respostas automáticas para demandas frequentes, sem deixar
                  cliente esperando.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <Workflow className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Menos operação manual
                </h3>
                <p className="text-sm text-slate-600">
                  Reduza tarefas repetitivas e libere o time para exceções e
                  vendas.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-start">
                <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                  <CalendarCheck2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Mais reservas com menos fricção
                </h3>
                <p className="text-sm text-slate-600">
                  Facilite o caminho da conversa até o agendamento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works + Objections */}
        <section id="integracao" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Como funciona
              </h2>
              <ol className="space-y-5">
                <li className="flex gap-3">
                  <span className="mt-1 h-6 w-6 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                    1
                  </span>
                  <p className="text-slate-700">Conecte sua conta Bokun.</p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-6 w-6 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                    2
                  </span>
                  <p className="text-slate-700">Ative WhatsApp e/ou Telegram.</p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-6 w-6 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                    3
                  </span>
                  <p className="text-slate-700">
                    Publique seus fluxos e comece a operar.
                  </p>
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Perguntas comuns antes de começar
              </h2>
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Vai ser complicado de configurar?
                  </h3>
                  <p className="mt-1 text-slate-600">
                    Não. O onboarding é simples para quem já opera com Bokun.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Vou perder controle do atendimento?
                  </h3>
                  <p className="mt-1 text-slate-600">
                    Não. A automação cobre o repetitivo e o time atua nos casos
                    estratégicos.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Posso validar antes de contratar?
                  </h3>
                  <p className="mt-1 text-slate-600">
                    Sim. Você testa por 7 dias grátis, sem cartão de crédito.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">
              Escolha o plano que combina com sua operação
            </h2>
            <p className="text-slate-600 text-center mb-12 text-base">
              Plano mensal para flexibilidade. Plano anual com 2 meses grátis.
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
                    Bot Bokun-first para WhatsApp e Telegram
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Fluxos de atendimento e agendamento
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Suporte por email
                  </li>
                </ul>
                <a
                  href="/api/create-checkout-session?plan=monthly"
                  className="w-full text-center bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Testar grátis por 7 dias
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
                    Bot Bokun-first para WhatsApp e Telegram
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Fluxos de atendimento e agendamento
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    Suporte por email
                  </li>
                </ul>
                <a
                  href="/api/create-checkout-session?plan=annual"
                  className="w-full text-center bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Testar grátis por 7 dias
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-white p-8 sm:p-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1 text-sm text-green-700 mb-4">
                <ShieldCheck className="h-4 w-4" />
                Sem cartão de crédito
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Pronto para automatizar seu atendimento com Bokun?
              </h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                Comece o teste gratuito e valide na prática como reduzir carga
                operacional e acelerar respostas.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://apps.bokun.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Testar grátis por 7 dias
                </a>
                <a
                  href="#integracao"
                  className="border border-slate-300 text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-lg font-semibold text-base transition-colors"
                >
                  Conectar Bokun ao WhatsApp ou Telegram
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
