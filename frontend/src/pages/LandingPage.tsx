import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  Check,
  MessageCircleMore,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

const integrationChips = [
  "WhatsApp",
  "Telegram",
  "Bokun",
  "Stripe",
  "Google Calendar",
  "Notion",
  "Gmail",
  "Slack",
  "API-first",
  "Webhooks",
  "CRM",
  "n8n",
];

const featureCards = [
  {
    icon: MessageCircleMore,
    title: "Atendimento mais rápido no WhatsApp e Telegram",
    description:
      "Respostas automáticas para dúvidas frequentes e conversas organizadas para não perder oportunidades de reserva.",
    category: "Mensageria",
  },
  {
    icon: CalendarCheck2,
    title: "Fluxo de reservas orientado ao Bokun",
    description:
      "Conecte sua operação e leve o cliente da conversa ao agendamento com menos fricção e menos retrabalho manual.",
    category: "Booking",
  },
  {
    icon: Bot,
    title: "Automação com IA para operação real",
    description:
      "A IA cobre tarefas repetitivas e seu time atua nos casos estratégicos, com controle do processo ponta a ponta.",
    category: "IA aplicada",
  },
  {
    icon: Workflow,
    title: "Setup simples e rápido",
    description:
      "Onboarding desenhado para quem já usa Bokun: conectar, ativar canais e começar a operar em minutos.",
    category: "Onboarding",
  },
  {
    icon: Zap,
    title: "Disponibilidade 24/7",
    description:
      "Seu atendimento continua ativo fora do horário comercial, inclusive fins de semana e feriados.",
    category: "Always on",
  },
  {
    icon: Shield,
    title: "Controle e previsibilidade",
    description:
      "Fluxos claros, regras de operação e suporte para escalar atendimento sem perder qualidade.",
    category: "Operação",
  },
];

const faqItems = [
  {
    q: "O que é o Bokun Bot?",
    a: "É um assistente de atendimento e agendamentos para estabelecimentos que usam Bokun. Ele ajuda a automatizar conversas no WhatsApp e Telegram com foco em operação de reservas.",
  },
  {
    q: "Preciso de conhecimento técnico para configurar?",
    a: "Não. O setup foi pensado para operação de negócio. Em geral, você conecta os canais, valida os fluxos e já começa a operar.",
  },
  {
    q: "O Bokun Bot funciona 24/7?",
    a: "Sim. A automação fica ativa continuamente para reduzir filas, responder mais rápido e evitar perda de demanda.",
  },
  {
    q: "Posso usar com WhatsApp e Telegram ao mesmo tempo?",
    a: "Sim. Você pode ativar um ou ambos os canais conforme sua estratégia de atendimento.",
  },
  {
    q: "Como funciona o teste grátis?",
    a: "Você testa por 7 dias, sem cartão de crédito, com acesso ao fluxo principal para validar aderência na prática.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem fidelidade obrigatória: você pode ajustar ou cancelar conforme o momento da sua operação.",
  },
  {
    q: "Quais são os custos além da assinatura?",
    a: "Além do plano do Bokun Bot, podem existir custos de provedores externos usados na sua stack (por exemplo, APIs e canais de mensageria), conforme consumo.",
  },
];

export default function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-warm-bg text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle/80 bg-warm-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#hero" className="font-display text-2xl font-semibold tracking-tight">
            Bokun Bot
          </a>

          <nav className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-text-primary">
              Recursos
            </a>
            <a href="#pricing" className="transition-colors hover:text-text-primary">
              Planos
            </a>
            <a href="#faq" className="transition-colors hover:text-text-primary">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/auth"
              className="rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Login
            </a>
            <a
              href="https://apps.bokun.io"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-lime-accent px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
            >
              Teste grátis
            </a>
          </div>
        </div>
      </header>

      <main>
        <section
          id="hero"
          className="relative overflow-hidden border-b border-border-subtle/70 bg-[linear-gradient(to_right,rgba(229,224,216,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(229,224,216,0.55)_1px,transparent_1px)] bg-[size:52px_52px]"
        >
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20 lg:px-8">
            <div className="mb-7 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-lime-600" />
                Operação assistida por IA
              </span>
            </div>

            <h1 className="font-display mx-auto max-w-4xl text-center text-5xl leading-[1.04] tracking-tight text-slate-900 sm:text-6xl">
              Automatize atendimento e agendamentos do seu Bokun no WhatsApp e Telegram.
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-text-secondary">
              Conecte seus canais em minutos e transforme mensagens em reservas com menos trabalho manual. Teste por
              7 dias, sem cartão de crédito.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="https://apps.bokun.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#082d33] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c3f46]"
              >
                Testar grátis por 7 dias
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#integracao"
                className="inline-flex items-center justify-center rounded-xl border border-border-subtle bg-surface px-7 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-accent-cream"
              >
                Conectar Bokun ao WhatsApp ou Telegram
              </a>
            </div>

            <p className="mt-4 text-center text-sm text-text-secondary">Sem cartão de crédito</p>

            <div className="pointer-events-none">
              <div className="absolute left-[10%] top-28 hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Atendimento contínuo
              </div>
              <div className="absolute right-[10%] top-28 hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Integração Bokun-first
              </div>
              <div className="absolute left-[12%] top-[62%] hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Fluxos orientados a reservas
              </div>
              <div className="absolute right-[14%] top-[56%] hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Setup em minutos
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Tecnologias confiáveis no seu stack
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {["OpenAI", "Bokun", "n8n", "Convex", "Stripe", "Supabase"].map((tech) => (
                <div
                  key={tech}
                  className="glass-card flex h-14 items-center justify-center rounded-xl text-sm font-semibold text-slate-700"
                >
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-flex rounded-full border border-border-subtle bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                Recursos essenciais
              </span>
              <h2 className="font-display mx-auto mt-4 max-w-3xl text-4xl leading-tight text-slate-900 sm:text-5xl">
                Tudo o que você precisa para escalar atendimento e reservas no Bokun.
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">
                Estrutura pensada para operações que já usam Bokun e querem ganhar escala com simplicidade operacional.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="glass-card rounded-3xl p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex rounded-lg bg-lime-accent/60 p-2">
                        <Icon className="h-4 w-4 text-slate-800" />
                      </div>
                      <span className="rounded-full border border-border-subtle bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                        {feature.category}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl leading-tight text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="integracao" className="mt-14 bg-[#052a2e] py-20 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8ef92]">
              Integrações
            </span>
            <h2 className="font-display mt-5 text-4xl sm:text-5xl">Não substitua. Integre.</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">
              Conecte o Bokun Bot ao seu stack atual e mantenha sua operação fluindo nos canais em que seu time já
              trabalha.
            </p>

            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {integrationChips.map((chip) => (
                <div
                  key={chip}
                  className="rounded-lg border border-white/15 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-8 sm:p-10">
              <div className="text-center">
                <h2 className="font-display text-5xl text-slate-900">Planos</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
                  Comece com flexibilidade no mensal ou maximize eficiência no anual com 2 meses grátis.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-border-subtle bg-surface p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold text-slate-900">Mensal</h3>
                    <span className="rounded-full bg-accent-cream px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                      Flexível
                    </span>
                  </div>
                  <p className="mb-5 text-sm text-text-secondary">Para operações que querem começar rápido.</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Mensagens e fluxos automáticos
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Integração Bokun + canais de chat
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Suporte por email
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      7 dias de teste grátis
                    </li>
                  </ul>
                  <p className="font-display mt-7 text-5xl text-slate-900">€29</p>
                  <p className="mt-1 text-xs text-text-secondary">por mês</p>
                  <a
                    href="/api/create-checkout-session?plan=monthly"
                    className="mt-4 inline-flex w-full justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Iniciar teste grátis
                  </a>
                  <p className="mt-2 text-center text-xs text-text-secondary">Sem cartão de crédito</p>
                </article>

                <article className="rounded-2xl border border-black bg-black p-6 text-white shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold">Anual</h3>
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      2 meses grátis
                    </span>
                  </div>
                  <p className="mb-5 text-sm text-white/70">Para quem quer reduzir custo total e escalar com previsibilidade.</p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-300" />
                      Tudo do plano mensal
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-300" />
                      Melhor custo-benefício anual
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-300" />
                      Prioridade de suporte
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-300" />
                      7 dias de teste grátis
                    </li>
                  </ul>
                  <p className="font-display mt-7 text-5xl">€290</p>
                  <p className="mt-1 text-xs text-white/70">cobrança anual</p>
                  <a
                    href="/api/create-checkout-session?plan=annual"
                    className="mt-4 inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
                  >
                    Iniciar teste grátis
                  </a>
                  <p className="mt-2 text-center text-xs text-white/70">Sem cartão de crédito</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-5xl text-slate-900">Perguntas Frequentes</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
                Respostas diretas para as dúvidas mais comuns antes de iniciar sua operação.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {faqItems.map((item) => (
                <details key={item.q} className="glass-card rounded-2xl p-5 group">
                  <summary className="cursor-pointer list-none text-left font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-lime-500" />
                      {item.q}
                    </span>
                  </summary>
                  <p className="mt-3 pl-5 text-sm leading-relaxed text-text-secondary">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-lime-accent px-7 py-10 sm:flex-row sm:items-center sm:px-10">
              <h3 className="font-display max-w-xl text-4xl leading-tight text-slate-900 sm:text-5xl">
                Pronto para automatizar seu atendimento com Bokun?
              </h3>
              <a
                href="https://apps.bokun.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#082d33] px-5 py-3 text-sm font-semibold text-white"
              >
                Testar grátis por 7 dias
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-[#f6f2eb] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="font-display text-3xl text-slate-900">Bokun Bot</p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Automatizamos atendimento e agendamentos para quem já opera com Bokun.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Produto</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <a href="#features" className="hover:text-text-primary">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-text-primary">
                    Planos
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-text-primary">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Suporte</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <a href="mailto:info@iaoperators.com" className="hover:text-text-primary">
                    info@iaoperators.com
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-text-primary">
                    Termos e Condições
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-text-primary">
                    Política de Privacidade
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border-subtle pt-5 text-center text-xs text-text-secondary">
            © {currentYear} Bokun Bot. Todos os direitos reservados. Criado por IA Operators.
          </div>
        </div>
      </footer>
    </div>
  );
}
