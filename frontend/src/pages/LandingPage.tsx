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
import { type Locale, useI18n } from "@/i18n";

const BRAND_LOGO_SRC = "/chatplug-newlogo.svg";

type LandingCopy = {
  nav: { features: string; pricing: string; faq: string; login: string; trial: string };
  hero: { badge: string; title: string; subtitle: string; cta: string; noCard: string; bubbles: [string, string, string, string] };
  features: { badge: string; title: string; subtitle: string };
  integrations: { badge: string; title: string; subtitle: string; cta: string };
  pricing: {
    title: string;
    subtitle: string;
    monthlyTitle: string;
    monthlyTag: string;
    monthlyDesc: string;
    annualTitle: string;
    annualTag: string;
    annualDesc: string;
    cta: string;
    noCard: string;
  };
  faq: { title: string; subtitle: string };
  finalCta: { title: string; button: string };
  footer: { product: string; support: string; terms: string; privacy: string; about: string; rights: string };
  checklist: { m1: string; m2: string; m3: string; m4: string; a1: string; a2: string; a3: string; a4: string };
};

const copyByLocale: Record<Locale, LandingCopy> = {
  pt: {
    nav: { features: "Recursos", pricing: "Planos", faq: "FAQ", login: "Login", trial: "Teste grátis" },
    hero: {
      badge: "Operação assistida por IA",
      title: "Automatize atendimento e agendamentos do seu Bokun no WhatsApp e Telegram.",
      subtitle:
        "Conecte seus canais em minutos e transforme mensagens em reservas com menos trabalho manual. Teste por 7 dias, sem cartão de crédito.",
      cta: "Testar grátis por 7 dias",
      noCard: "Sem cartão de crédito",
      bubbles: [
        "Quero agendar para 2 pessoas\namanhã às 10h.",
        "Preciso cancelar minha\nreserva de hoje.",
        "Quais atividades vocês têm\ndisponíveis neste fim de semana?",
        "Dá para remarcar meu passeio\npara sexta no período da tarde?",
      ],
    },
    features: {
      badge: "Recursos essenciais",
      title: "Tudo o que você precisa para escalar atendimento e reservas no Bokun.",
      subtitle: "Estrutura pensada para operações que já usam Bokun e querem ganhar escala com simplicidade operacional.",
    },
    integrations: {
      badge: "Sob medida",
      title: "Integrações sob medida para sua stack.",
      subtitle:
        "Conectamos o ChatPlug ao seu ecossistema real com arquitetura pronta para produção: canais, CRM, automações, pagamentos e APIs.",
      cta: "Falar com a gente",
    },
    pricing: {
      title: "Planos",
      subtitle: "Comece com flexibilidade no mensal ou maximize eficiência no anual com 2 meses grátis.",
      monthlyTitle: "Mensal",
      monthlyTag: "Flexível",
      monthlyDesc: "Para operações que querem começar rápido.",
      annualTitle: "Anual",
      annualTag: "2 meses grátis",
      annualDesc: "Para quem quer reduzir custo total e escalar com previsibilidade.",
      cta: "Iniciar teste grátis",
      noCard: "Sem cartão de crédito",
    },
    faq: {
      title: "Perguntas Frequentes",
      subtitle: "Respostas diretas para as dúvidas mais comuns antes de iniciar sua operação.",
    },
    finalCta: {
      title: "Pronto para automatizar seu atendimento com Bokun?",
      button: "Testar grátis por 7 dias",
    },
    footer: {
      product: "Produto",
      support: "Suporte",
      terms: "Termos e Condições",
      privacy: "Política de Privacidade",
      about: "Automatizamos atendimento e agendamentos para quem já opera com Bokun.",
      rights: "Todos os direitos reservados. Criado por IA Operators.",
    },
    checklist: {
      m1: "Mensagens e fluxos automáticos",
      m2: "Integração Bokun + canais de chat",
      m3: "Suporte por email",
      m4: "7 dias de teste grátis",
      a1: "Tudo do plano mensal",
      a2: "Melhor custo-benefício anual",
      a3: "Prioridade de suporte",
      a4: "7 dias de teste grátis",
    },
  },
  en: {
    nav: { features: "Features", pricing: "Pricing", faq: "FAQ", login: "Login", trial: "Free trial" },
    hero: {
      badge: "AI-assisted operations",
      title: "Automate your Bokun support and bookings on WhatsApp and Telegram.",
      subtitle:
        "Connect your channels in minutes and turn conversations into bookings with less manual work. Try it for 7 days, no credit card.",
      cta: "Start 7-day free trial",
      noCard: "No credit card required",
      bubbles: [
        "I want to book for 2 people\ntomorrow at 10am.",
        "I need to cancel my\nbooking for today.",
        "Which activities do you have\navailable this weekend?",
        "Can I reschedule my tour\nto Friday afternoon?",
      ],
    },
    features: {
      badge: "Core features",
      title: "Everything you need to scale support and bookings with Bokun.",
      subtitle: "Built for teams already running Bokun and looking to scale with operational simplicity.",
    },
    integrations: {
      badge: "Custom",
      title: "Integrations tailored to your stack.",
      subtitle:
        "We connect ChatPlug to your real production ecosystem: channels, CRM, automations, payments, and APIs.",
      cta: "Talk to us",
    },
    pricing: {
      title: "Pricing",
      subtitle: "Start flexible monthly or maximize annual efficiency with 2 months free.",
      monthlyTitle: "Monthly",
      monthlyTag: "Flexible",
      monthlyDesc: "For teams that want to launch fast.",
      annualTitle: "Annual",
      annualTag: "2 months free",
      annualDesc: "For teams that want lower total cost and predictable scale.",
      cta: "Start free trial",
      noCard: "No credit card required",
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Straight answers to common questions before you launch.",
    },
    finalCta: {
      title: "Ready to automate your Bokun support?",
      button: "Start 7-day free trial",
    },
    footer: {
      product: "Product",
      support: "Support",
      terms: "Terms and Conditions",
      privacy: "Privacy Policy",
      about: "We automate support and bookings for teams running Bokun.",
      rights: "All rights reserved. Built by IA Operators.",
    },
    checklist: {
      m1: "Automated messages and flows",
      m2: "Bokun + chat channel integration",
      m3: "Email support",
      m4: "7-day free trial",
      a1: "Everything in monthly",
      a2: "Best annual cost-benefit",
      a3: "Priority support",
      a4: "7-day free trial",
    },
  },
  es: {
    nav: { features: "Recursos", pricing: "Planes", faq: "FAQ", login: "Login", trial: "Prueba gratis" },
    hero: {
      badge: "Operación asistida por IA",
      title: "Automatiza soporte y reservas de Bokun en WhatsApp y Telegram.",
      subtitle:
        "Conecta tus canales en minutos y convierte conversaciones en reservas con menos trabajo manual. Pruébalo 7 días, sin tarjeta.",
      cta: "Probar 7 días gratis",
      noCard: "Sin tarjeta de crédito",
      bubbles: [
        "Quiero reservar para 2 personas\nmañana a las 10h.",
        "Necesito cancelar mi\nreserva de hoy.",
        "¿Qué actividades tienen\ndisponibles este fin de semana?",
        "¿Puedo reprogramar mi paseo\npara el viernes por la tarde?",
      ],
    },
    features: {
      badge: "Recursos clave",
      title: "Todo lo que necesitas para escalar soporte y reservas con Bokun.",
      subtitle: "Pensado para equipos que ya usan Bokun y quieren escalar con simplicidad operativa.",
    },
    integrations: {
      badge: "A medida",
      title: "Integraciones a medida para tu stack.",
      subtitle:
        "Conectamos ChatPlug a tu ecosistema real de producción: canales, CRM, automatizaciones, pagos y APIs.",
      cta: "Hablar con nosotros",
    },
    pricing: {
      title: "Planes",
      subtitle: "Empieza flexible con mensual o maximiza eficiencia anual con 2 meses gratis.",
      monthlyTitle: "Mensual",
      monthlyTag: "Flexible",
      monthlyDesc: "Para equipos que quieren empezar rápido.",
      annualTitle: "Anual",
      annualTag: "2 meses gratis",
      annualDesc: "Para equipos que buscan menor costo total y escalabilidad predecible.",
      cta: "Iniciar prueba gratis",
      noCard: "Sin tarjeta de crédito",
    },
    faq: {
      title: "Preguntas Frecuentes",
      subtitle: "Respuestas directas para las dudas más comunes antes de lanzar.",
    },
    finalCta: {
      title: "¿Listo para automatizar tu soporte con Bokun?",
      button: "Probar 7 días gratis",
    },
    footer: {
      product: "Producto",
      support: "Soporte",
      terms: "Términos y Condiciones",
      privacy: "Política de Privacidad",
      about: "Automatizamos soporte y reservas para equipos que operan con Bokun.",
      rights: "Todos los derechos reservados. Creado por IA Operators.",
    },
    checklist: {
      m1: "Mensajes y flujos automáticos",
      m2: "Integración Bokun + canales de chat",
      m3: "Soporte por email",
      m4: "Prueba gratis de 7 días",
      a1: "Todo del plan mensual",
      a2: "Mejor relación coste-beneficio anual",
      a3: "Soporte prioritario",
      a4: "Prueba gratis de 7 días",
    },
  },
};

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

const featureCardsByLocale: Record<Locale, Array<{ icon: typeof Bot; title: string; description: string; category: string }>> = {
  pt: [
    {
      icon: MessageCircleMore,
      title: "Atendimento mais rápido no WhatsApp e Telegram",
      description: "Respostas automáticas para dúvidas frequentes e conversas organizadas para não perder oportunidades de reserva.",
      category: "Mensageria",
    },
    {
      icon: CalendarCheck2,
      title: "Fluxo de reservas orientado ao Bokun",
      description: "Conecte sua operação e leve o cliente da conversa ao agendamento com menos fricção e menos retrabalho manual.",
      category: "Booking",
    },
    {
      icon: Bot,
      title: "Automação com IA para operação real",
      description: "A IA cobre tarefas repetitivas e seu time atua nos casos estratégicos, com controle do processo ponta a ponta.",
      category: "IA aplicada",
    },
    {
      icon: Workflow,
      title: "Setup simples e rápido",
      description: "Onboarding desenhado para quem já usa Bokun: conectar, ativar canais e começar a operar em minutos.",
      category: "Onboarding",
    },
    {
      icon: Zap,
      title: "Disponibilidade 24/7",
      description: "Seu atendimento continua ativo fora do horário comercial, inclusive fins de semana e feriados.",
      category: "Always on",
    },
    {
      icon: Shield,
      title: "Controle e previsibilidade",
      description: "Fluxos claros, regras de operação e suporte para escalar atendimento sem perder qualidade.",
      category: "Operação",
    },
  ],
  en: [
    {
      icon: MessageCircleMore,
      title: "Faster support on WhatsApp and Telegram",
      description: "Automated answers for frequent questions and structured conversations that avoid lost booking opportunities.",
      category: "Messaging",
    },
    {
      icon: CalendarCheck2,
      title: "Bokun-first booking flow",
      description: "Connect your operation and move the customer from chat to booking with less friction and less manual rework.",
      category: "Booking",
    },
    {
      icon: Bot,
      title: "AI automation for real operations",
      description: "AI handles repetitive tasks while your team focuses on strategic cases with end-to-end control.",
      category: "Applied AI",
    },
    {
      icon: Workflow,
      title: "Simple, fast setup",
      description: "Onboarding built for Bokun teams: connect, activate channels, and start operating in minutes.",
      category: "Onboarding",
    },
    {
      icon: Zap,
      title: "24/7 availability",
      description: "Support stays active outside business hours, including weekends and holidays.",
      category: "Always on",
    },
    {
      icon: Shield,
      title: "Control and predictability",
      description: "Clear flows and operational guardrails to scale support without losing quality.",
      category: "Operations",
    },
  ],
  es: [
    {
      icon: MessageCircleMore,
      title: "Atención más rápida en WhatsApp y Telegram",
      description: "Respuestas automáticas para dudas frecuentes y conversaciones organizadas para no perder oportunidades de reserva.",
      category: "Mensajería",
    },
    {
      icon: CalendarCheck2,
      title: "Flujo de reservas orientado a Bokun",
      description: "Conecta tu operación y lleva al cliente del chat a la reserva con menos fricción y menos retrabajo manual.",
      category: "Booking",
    },
    {
      icon: Bot,
      title: "Automatización con IA para operación real",
      description: "La IA cubre tareas repetitivas y tu equipo actúa en casos estratégicos con control de punta a punta.",
      category: "IA aplicada",
    },
    {
      icon: Workflow,
      title: "Setup simple y rápido",
      description: "Onboarding diseñado para quienes ya usan Bokun: conectar, activar canales y empezar a operar en minutos.",
      category: "Onboarding",
    },
    {
      icon: Zap,
      title: "Disponibilidad 24/7",
      description: "Tu atención sigue activa fuera del horario comercial, incluidos fines de semana y festivos.",
      category: "Always on",
    },
    {
      icon: Shield,
      title: "Control y previsibilidad",
      description: "Flujos claros y reglas operativas para escalar atención sin perder calidad.",
      category: "Operación",
    },
  ],
};

const faqByLocale: Record<Locale, Array<{ q: string; a: string }>> = {
  pt: [
    { q: "O que é o Bokun Bot?", a: "É um assistente de atendimento e agendamentos para negócios que usam Bokun, automatizando conversas em WhatsApp e Telegram." },
    { q: "Preciso de conhecimento técnico para configurar?", a: "Não. O setup foi pensado para operação de negócio: conectar canais, validar fluxos e começar." },
    { q: "Funciona 24/7?", a: "Sim. A automação fica ativa continuamente para reduzir filas e evitar perda de demanda." },
    { q: "Posso usar WhatsApp e Telegram ao mesmo tempo?", a: "Sim. Você pode ativar um ou ambos os canais conforme sua estratégia." },
    { q: "Como funciona o teste grátis?", a: "Você testa por 7 dias com o fluxo principal para validar aderência na prática." },
    { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade obrigatória." },
  ],
  en: [
    { q: "What is Bokun Bot?", a: "It is a support and booking assistant for teams using Bokun, automating conversations on WhatsApp and Telegram." },
    { q: "Do I need technical knowledge to set it up?", a: "No. Setup is designed for business operations: connect channels, validate flows, and go live." },
    { q: "Does it run 24/7?", a: "Yes. Automation stays active continuously to reduce queues and prevent lost demand." },
    { q: "Can I use WhatsApp and Telegram at the same time?", a: "Yes. You can activate one or both channels according to your strategy." },
    { q: "How does the free trial work?", a: "You can test for 7 days with the main flow to validate fit in real operations." },
    { q: "Can I cancel anytime?", a: "Yes. No mandatory long-term commitment." },
  ],
  es: [
    { q: "¿Qué es Bokun Bot?", a: "Es un asistente de atención y reservas para equipos que usan Bokun, automatizando conversaciones en WhatsApp y Telegram." },
    { q: "¿Necesito conocimientos técnicos para configurarlo?", a: "No. El setup está diseñado para operaciones: conectar canales, validar flujos y empezar." },
    { q: "¿Funciona 24/7?", a: "Sí. La automatización se mantiene activa continuamente para reducir colas y evitar pérdida de demanda." },
    { q: "¿Puedo usar WhatsApp y Telegram al mismo tiempo?", a: "Sí. Puedes activar uno o ambos canales según tu estrategia." },
    { q: "¿Cómo funciona la prueba gratis?", a: "Pruebas durante 7 días con el flujo principal para validar encaje en la práctica." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin permanencia obligatoria." },
  ],
};

export default function LandingPage() {
  const currentYear = new Date().getFullYear();
  const { locale, setLocale } = useI18n();
  const copy = copyByLocale[locale];
  const featureCards = featureCardsByLocale[locale];
  const faqItems = faqByLocale[locale];

  return (
    <div className="min-h-screen bg-warm-bg text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle/80 bg-warm-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#hero" aria-label="ChatPlug" className="inline-flex items-center">
            <img src={BRAND_LOGO_SRC} alt="ChatPlug" className="h-9 w-auto object-contain" />
          </a>

          <nav className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-text-primary">{copy.nav.features}</a>
            <a href="#pricing" className="transition-colors hover:text-text-primary">{copy.nav.pricing}</a>
            <a href="#faq" className="transition-colors hover:text-text-primary">{copy.nav.faq}</a>
          </nav>

          <div className="flex items-center gap-2">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="h-8 rounded-md border border-border-subtle bg-surface px-2 text-xs"
            >
              <option value="pt">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
            <Link to="/auth?mode=signin" className="rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
              {copy.nav.login}
            </Link>
            <Link to="/auth?mode=signup" className="rounded-full bg-lime-accent px-4 py-2 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5">
              {copy.nav.trial}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden border-b border-border-subtle/70 bg-[linear-gradient(to_right,rgba(229,224,216,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(229,224,216,0.55)_1px,transparent_1px)] bg-[size:52px_52px]">
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20 lg:px-8">
            <div className="mb-7 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-lime-600" />
                {copy.hero.badge}
              </span>
            </div>

            <h1 className="font-display mx-auto max-w-4xl text-center text-5xl leading-[1.04] tracking-tight text-slate-900 sm:text-6xl">
              {copy.hero.title}
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-text-secondary">
              {copy.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth?mode=signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#082d33] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c3f46]">
                {copy.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-4 text-center text-sm text-text-secondary">{copy.hero.noCard}</p>

            <div className="pointer-events-none">
              <div className="chat-float absolute left-[10%] top-28 hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                <span className="whitespace-pre-line">{copy.hero.bubbles[0]}</span>
                <span className="absolute -bottom-1 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-1 absolute right-[10%] top-28 hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                <span className="whitespace-pre-line">{copy.hero.bubbles[1]}</span>
                <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-2 absolute left-[12%] top-[82%] hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                <span className="whitespace-pre-line">{copy.hero.bubbles[2]}</span>
                <span className="absolute -bottom-1 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
              <div className="chat-float chat-float-delay-3 absolute right-[14%] top-[76%] hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium leading-tight text-text-secondary shadow-sm lg:block">
                <span className="whitespace-pre-line">{copy.hero.bubbles[3]}</span>
                <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border-subtle bg-surface" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-flex rounded-full border border-border-subtle bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">{copy.features.badge}</span>
              <h2 className="font-display mx-auto mt-4 max-w-3xl text-4xl leading-tight text-slate-900 sm:text-5xl">{copy.features.title}</h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">{copy.features.subtitle}</p>
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
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8ef92]">{copy.integrations.badge}</span>
            <h2 className="font-display mt-5 text-4xl sm:text-5xl">{copy.integrations.title}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">{copy.integrations.subtitle}</p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="mailto:info@iaoperators.com?subject=Integrations%20-%20ChatPlug" className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-accent px-7 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#d8ef92]">
                {copy.integrations.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {integrationChips.map((chip) => (
                <div key={chip.name} className="rounded-lg border border-white/15 bg-white px-3 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <img src={chip.logo} alt={chip.name} title={chip.name} className="h-5 w-5 object-contain" loading="lazy" />
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
                <h2 className="font-display text-5xl text-slate-900">{copy.pricing.title}</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">{copy.pricing.subtitle}</p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-border-subtle bg-surface p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold text-slate-900">{copy.pricing.monthlyTitle}</h3>
                    <span className="rounded-full bg-accent-cream px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">{copy.pricing.monthlyTag}</span>
                  </div>
                  <p className="mb-5 text-sm text-text-secondary">{copy.pricing.monthlyDesc}</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{copy.checklist.m1}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{copy.checklist.m2}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{copy.checklist.m3}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{copy.checklist.m4}</li>
                  </ul>
                  <p className="font-display mt-7 text-5xl text-slate-900">€29</p>
                  <p className="mt-1 text-xs text-text-secondary">/month</p>
                  <Link to="/auth?mode=signup&plan=monthly" className="mt-4 inline-flex w-full justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white">
                    {copy.pricing.cta}
                  </Link>
                  <p className="mt-2 text-center text-xs text-text-secondary">{copy.pricing.noCard}</p>
                </article>

                <article className="rounded-2xl border border-black bg-black p-6 text-white shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-3xl font-semibold">{copy.pricing.annualTitle}</h3>
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase">{copy.pricing.annualTag}</span>
                  </div>
                  <p className="mb-5 text-sm text-white/70">{copy.pricing.annualDesc}</p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{copy.checklist.a1}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{copy.checklist.a2}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{copy.checklist.a3}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" />{copy.checklist.a4}</li>
                  </ul>
                  <p className="font-display mt-7 text-5xl">€290</p>
                  <p className="mt-1 text-xs text-white/70">/year</p>
                  <Link to="/auth?mode=signup&plan=annual" className="mt-4 inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
                    {copy.pricing.cta}
                  </Link>
                  <p className="mt-2 text-center text-xs text-white/70">{copy.pricing.noCard}</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-5xl text-slate-900">{copy.faq.title}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">{copy.faq.subtitle}</p>
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
              <h3 className="font-display max-w-xl text-4xl leading-tight text-slate-900 sm:text-5xl">{copy.finalCta.title}</h3>
              <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-xl bg-[#082d33] px-5 py-3 text-sm font-semibold text-white">
                {copy.finalCta.button}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-[#f6f2eb] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <img src={BRAND_LOGO_SRC} alt="ChatPlug" className="h-10 w-auto object-contain" />
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{copy.footer.about}</p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">{copy.footer.product}</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#features" className="hover:text-text-primary">{copy.nav.features}</a></li>
                <li><a href="#pricing" className="hover:text-text-primary">{copy.nav.pricing}</a></li>
                <li><a href="#faq" className="hover:text-text-primary">{copy.nav.faq}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">{copy.footer.support}</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="mailto:info@iaoperators.com" className="hover:text-text-primary">info@iaoperators.com</a></li>
                <li><Link to="/terms" className="hover:text-text-primary">{copy.footer.terms}</Link></li>
                <li><Link to="/privacy" className="hover:text-text-primary">{copy.footer.privacy}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border-subtle pt-5 text-center text-xs text-text-secondary">
            © {currentYear} ChatPlug. {copy.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
}
