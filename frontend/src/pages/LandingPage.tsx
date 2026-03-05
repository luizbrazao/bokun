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
import { Link } from "react-router-dom";

const BRAND_LOGO_SRC = "/chatplug-newlogo.svg";

const integrationChips = [
  { name: "WhatsApp", logo: "https://cdn.simpleicons.org/whatsapp/25D366" },
  { name: "Telegram", logo: "https://cdn.simpleicons.org/telegram/229ED9" },
  { name: "Bokun", logo: "https://apps.bokun.io/favicon.ico" },
  { name: "Stripe", logo: "https://cdn.simpleicons.org/stripe/635BFF" },
  { name: "Google Calendar", logo: "https://cdn.simpleicons.org/googlecalendar/4285F4" },
  { name: "Notion", logo: "https://cdn.simpleicons.org/notion/111111" },
  { name: "Gmail", logo: "https://cdn.simpleicons.org/gmail/EA4335" },
  { name: "Slack", logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/slack.svg" },
  { name: "Postman", logo: "https://cdn.simpleicons.org/postman/FF6C37" },
  { name: "Zapier", logo: "https://cdn.simpleicons.org/zapier/FF4A00" },
  { name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot/FF7A59" },
  { name: "n8n", logo: "https://cdn.simpleicons.org/n8n/EA4B71" },
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
          <a href="#hero" aria-label="ChatPlug" className="inline-flex items-center">
            <img src={BRAND_LOGO_SRC} alt="ChatPlug" className="h-9 w-auto object-contain" />
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
              href="/auth?mode=signin"
              className="rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Login
            </a>
            <a
              href="/auth?mode=signup"
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
                href="/auth?mode=signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#082d33] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c3f46]"
              >
                Testar grátis por 7 dias
                <ArrowRight className="h-4 w-4" />
              </a>

            </div>

            <p className="mt-4 text-center text-sm text-text-secondary">Sem cartão de crédito</p>

            <div className="pointer-events-none">
              <div className="chat-float absolute left-[10%] top-28 hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                Quero agendar para 2 pessoas
                <br />
                amanhã às 10h.
                <span className="absolute -bottom-1 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-1 absolute right-[10%] top-28 hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                Preciso cancelar minha
                <br />
                reserva de hoje.
                <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-2 absolute left-[12%] top-[82%] hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                Quais atividades vocês têm
                <br />
                disponíveis neste fim de semana?
                <span className="absolute -bottom-1 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-3 absolute right-[14%] top-[76%] hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                Dá para remarcar meu passeio
                <br />
                para sexta no período da tarde?
                <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
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
              Sob medida
            </span>
            <h2 className="font-display mt-5 text-4xl sm:text-5xl">Integrações sob medida para sua stack.</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">
              Conectamos o ChatPlug ao seu ecossistema real com arquitetura pronta para produção: canais, CRM,
              automações, pagamentos e APIs. Se você tem um fluxo específico, a gente desenha com você.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:info@iaoperators.com?subject=Integra%C3%A7%C3%B5es%20sob%20medida%20-%20ChatPlug"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-accent px-7 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#d8ef92]"
              >
                Falar com a gente
                <ArrowRight className="h-4 w-4" />
              </a>

            </div>

            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {integrationChips.map((chip) => (
                <div
                  key={chip.name}
                  className="rounded-lg border border-white/15 bg-white px-3 py-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src={chip.logo}
                      alt={chip.name}
                      title={chip.name}
                      className="h-5 w-5 object-contain"
                      loading="lazy"
                    />
                    <span className="text-sm font-semibold text-slate-800">{chip.name}</span>
                  </div>
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
                    href="/auth?mode=signup&plan=monthly"
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
                    href="/auth?mode=signup&plan=annual"
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
                href="/auth?mode=signup"
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
              <img src={BRAND_LOGO_SRC} alt="ChatPlug" className="h-10 w-auto object-contain" />
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
                  <Link to="/terms" className="hover:text-text-primary">
                    Termos e Condições
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-text-primary">
                    Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border-subtle pt-5 text-center text-xs text-text-secondary">
            © {currentYear} ChatPlug. Todos os direitos reservados. Criado por IA Operators.
          </div>
        </div>
      </footer>
    </div>
  );
}
