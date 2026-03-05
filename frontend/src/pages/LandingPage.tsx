import {
  ArrowRight,
  Bot,
  Check,
  MessageCircleMore,
  Sparkles,
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-bg text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle/80 bg-warm-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#hero" className="font-display text-2xl font-semibold tracking-tight">
            Bokun Bot
          </a>

          <nav className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-text-primary">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-text-primary">
              Pricing
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
              Testar grátis
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
                Tony · Google Meets
              </div>
              <div className="absolute right-[10%] top-28 hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Pepper · Estratégia
              </div>
              <div className="absolute left-[12%] top-[62%] hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Friday · Research
              </div>
              <div className="absolute right-[14%] top-[56%] hidden rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-text-secondary lg:block">
                Wanda · Creator
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

        <section id="features" className="py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <span className="inline-flex rounded-full border border-border-subtle bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                Latest technologies
              </span>
              <h2 className="font-display mx-auto mt-4 max-w-3xl text-4xl leading-tight text-slate-900 sm:text-5xl">
                Tecnologia de orquestração para quem não tem tempo a perder.
              </h2>
            </div>

            <div className="space-y-4">
              <article className="glass-card grid gap-6 rounded-3xl p-6 md:grid-cols-2 md:items-center">
                <div>
                  <h3 className="font-display text-3xl text-slate-900">Dashboard Operacional</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    Visualize o progresso em tempo real. Cards avançam sozinhos conforme os agentes executam tarefas.
                  </p>
                  <a
                    href="/auth"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#082d33] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Explorar fluxo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between text-xs text-text-secondary">
                    <span>Kanban autônomo</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dff58c] px-2 py-0.5 text-slate-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="space-y-2 rounded-lg bg-[#f8f8f5] p-2">
                      <p className="font-semibold text-text-secondary">Inbox</p>
                      <div className="h-2 rounded bg-accent-cream" />
                      <div className="h-2 rounded bg-accent-cream" />
                    </div>
                    <div className="space-y-2 rounded-lg bg-[#f8f8f5] p-2">
                      <p className="font-semibold text-text-secondary">Em processo</p>
                      <div className="h-2 rounded bg-accent-cream" />
                      <div className="h-2 rounded bg-accent-cream" />
                    </div>
                    <div className="space-y-2 rounded-lg bg-[#f8f8f5] p-2">
                      <p className="font-semibold text-text-secondary">Done</p>
                      <div className="h-2 rounded bg-[#dff58c]" />
                      <div className="h-2 rounded bg-[#dff58c]" />
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="glass-card rounded-3xl p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-lime-accent/60 p-2">
                    <MessageCircleMore className="h-4 w-4 text-slate-800" />
                  </div>
                  <h3 className="font-display text-2xl text-slate-900">Comando via Telegram</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    Não abre o dashboard. Mencione uma mensagem para o Jarvis e ele orquestra o time enquanto você toma
                    café.
                  </p>
                </article>

                <article className="glass-card rounded-3xl p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-lime-accent/60 p-2">
                    <Bot className="h-4 w-4 text-slate-800" />
                  </div>
                  <h3 className="font-display text-2xl text-slate-900">O Feito Maestro</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    O Jarvis não apenas conversa, ele delega. Ele entende sua demanda e aciona especialistas certos.
                  </p>
                </article>
              </div>
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
              Conecte o Bokun Bot ao seu stack atual e mantenha seus agentes operando onde seu time já trabalha.
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

        <section className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="mx-auto max-w-4xl font-display text-4xl leading-tight text-slate-900 sm:text-5xl">
              “Com o Bokun Bot não gerenciamos mais tickets, gerenciamos resultados.”
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Luiz Fernando Brazão · CEO da IA Operators</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="glass-card rounded-xl p-6">
                <p className="font-display text-4xl text-slate-900">2026</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">Bokun Bot lançado</p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <p className="font-display text-4xl text-slate-900">50K+</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">Tarefas executadas</p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <p className="font-display text-4xl text-slate-900">1K+</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">Operações ativas</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-8 sm:p-10">
              <div className="text-center">
                <h2 className="font-display text-5xl text-slate-900">Pricing Plans</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
                  Mensal para flexibilidade. Anual com 2 meses grátis para reduzir custo total.
                </p>
                <div className="mx-auto mt-5 inline-flex rounded-full bg-accent-cream p-1 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold">Anual</span>
                  <span className="px-3 py-1 text-text-secondary">Mensal</span>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-border-subtle bg-surface p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold text-slate-900">Starter</h3>
                    <span className="rounded-full bg-lime-accent/60 px-2 py-0.5 text-[10px] font-semibold uppercase">Free</span>
                  </div>
                  <p className="mb-5 text-sm text-text-secondary">Para validar o fluxo com seu time.</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />1 operação</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />WhatsApp ou Telegram</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Suporte por email</li>
                  </ul>
                  <p className="font-display mt-7 text-5xl text-slate-900">Free</p>
                  <a href="https://apps.bokun.io" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white">
                    Montar meu Squad
                  </a>
                </article>

                <article className="rounded-2xl border border-black bg-black p-6 text-white shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold">Pro</h3>
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase">Melhor escolha</span>
                  </div>
                  <p className="mb-5 text-sm text-white/70">Para equipes com maior volume.</p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />Até 3 operações</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />WhatsApp e Telegram</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />Dashboard operacional</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />Assistente de execução</li>
                  </ul>
                  <p className="font-display mt-7 text-5xl">€29</p>
                  <p className="mt-1 text-xs text-white/70">por mês</p>
                  <a href="/api/create-checkout-session?plan=monthly" className="mt-4 inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
                    Ativar plano Pro
                  </a>
                </article>

                <article className="rounded-2xl border border-border-subtle bg-surface p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold text-slate-900">Business</h3>
                    <span className="rounded-full bg-[#dbe4ff] px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-800">Escala de time</span>
                  </div>
                  <p className="mb-5 text-sm text-text-secondary">Para operações com múltiplos canais.</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Operações ilimitadas</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Playbooks avançados</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Integrações API-first</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Suporte prioritário</li>
                  </ul>
                  <p className="font-display mt-7 text-5xl text-slate-900">€290</p>
                  <p className="mt-1 text-xs text-text-secondary">cobrança anual · 2 meses grátis</p>
                  <a href="/api/create-checkout-session?plan=annual" className="mt-4 inline-flex w-full justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white">
                    Ativar plano Business
                  </a>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-lime-accent px-7 py-10 sm:flex-row sm:items-center sm:px-10">
              <h3 className="font-display max-w-xl text-4xl leading-tight text-slate-900 sm:text-5xl">
                Descubra o poder da automação operacional.
              </h3>
              <a
                href="https://apps.bokun.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#082d33] px-5 py-3 text-sm font-semibold text-white"
              >
                Montar meu Squad
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-[#f6f2eb] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <p className="font-display text-3xl text-slate-900">Bokun Bot</p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Orquestração de reservas e atendimento para estabelecimentos que usam Bokun em produção.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Solution</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>Operação IA</li>
                <li>Automações</li>
                <li>Segurança</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Customers</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>Operadores turísticos</li>
                <li>Times de suporte</li>
                <li>PMEs em escala</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Resources</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>Pricing</li>
                <li>Documentação</li>
                <li>Status</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border-subtle pt-5 text-center text-xs text-text-secondary">
            © 2026 Bokun Bot. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
