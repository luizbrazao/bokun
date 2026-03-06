import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { type Locale, useI18n } from "@/i18n";

type Section = { title: string; body: string[] };

const contentByLocale: Record<Locale, { title: string; updated: string; sections: Section[]; back: string }> = {
  pt: {
    title: "Termos de Uso",
    updated: "Última atualização: março de 2026",
    back: "Voltar para a landing",
    sections: [
      { title: "1. Aceitação", body: ["Ao utilizar a ChatPlug, você concorda com estes Termos. Caso não concorde, não utilize o serviço."] },
      { title: "2. Serviço", body: ["A ChatPlug oferece automação de atendimento e reservas com integrações como WhatsApp, Telegram e Bokun."] },
      { title: "3. Conta", body: ["Você é responsável por manter dados corretos e proteger suas credenciais de acesso."] },
      { title: "4. Planos e pagamentos", body: ["Oferecemos teste gratuito e planos pagos. Pagamentos são processados por provedores externos, como Stripe."] },
      { title: "5. Cancelamento", body: ["Você pode cancelar a qualquer momento. Cancelamento interrompe renovação automática conforme regras do plano."] },
      { title: "6. Uso permitido", body: ["É proibido utilizar a plataforma para spam, fraude ou atividades ilícitas."] },
      { title: "7. Privacidade", body: ["O tratamento de dados segue nossa Política de Privacidade."] },
      { title: "8. Alterações", body: ["Podemos alterar estes Termos periodicamente. A versão vigente será publicada nesta página."] },
      { title: "9. Limitação de responsabilidade", body: ["Não nos responsabilizamos por indisponibilidades de provedores terceiros fora do nosso controle razoável."] },
      { title: "10. Contato", body: ["Dúvidas: info@iaoperators.com"] },
    ],
  },
  en: {
    title: "Terms of Use",
    updated: "Last updated: March 2026",
    back: "Back to home",
    sections: [
      { title: "1. Acceptance", body: ["By using ChatPlug, you agree to these Terms. If you disagree, do not use the service."] },
      { title: "2. Service", body: ["ChatPlug provides support and booking automation with integrations such as WhatsApp, Telegram, and Bokun."] },
      { title: "3. Account", body: ["You are responsible for accurate account data and safeguarding your access credentials."] },
      { title: "4. Plans and payments", body: ["We offer a free trial and paid plans. Payments are processed by external providers such as Stripe."] },
      { title: "5. Cancellation", body: ["You may cancel at any time. Cancellation stops auto-renewal according to plan rules."] },
      { title: "6. Permitted use", body: ["Using the platform for spam, fraud, or unlawful activities is prohibited."] },
      { title: "7. Privacy", body: ["Data processing follows our Privacy Policy."] },
      { title: "8. Changes", body: ["We may update these Terms periodically. The current version is published on this page."] },
      { title: "9. Limitation of liability", body: ["We are not liable for outages caused by third-party providers beyond our reasonable control."] },
      { title: "10. Contact", body: ["Questions: info@iaoperators.com"] },
    ],
  },
  es: {
    title: "Términos de Uso",
    updated: "Última actualización: marzo de 2026",
    back: "Volver al inicio",
    sections: [
      { title: "1. Aceptación", body: ["Al usar ChatPlug, aceptas estos Términos. Si no estás de acuerdo, no uses el servicio."] },
      { title: "2. Servicio", body: ["ChatPlug ofrece automatización de atención y reservas con integraciones como WhatsApp, Telegram y Bokun."] },
      { title: "3. Cuenta", body: ["Eres responsable de mantener datos correctos y proteger tus credenciales de acceso."] },
      { title: "4. Planes y pagos", body: ["Ofrecemos prueba gratuita y planes de pago. Los pagos se procesan por proveedores externos como Stripe."] },
      { title: "5. Cancelación", body: ["Puedes cancelar en cualquier momento. La cancelación detiene la renovación automática según las reglas del plan."] },
      { title: "6. Uso permitido", body: ["Está prohibido usar la plataforma para spam, fraude o actividades ilícitas."] },
      { title: "7. Privacidad", body: ["El tratamiento de datos sigue nuestra Política de Privacidad."] },
      { title: "8. Cambios", body: ["Podemos actualizar estos Términos periódicamente. La versión vigente se publica en esta página."] },
      { title: "9. Limitación de responsabilidad", body: ["No respondemos por caídas de proveedores externos fuera de nuestro control razonable."] },
      { title: "10. Contacto", body: ["Consultas: info@iaoperators.com"] },
    ],
  },
};

export default function TermsOfUsePage() {
  const { locale } = useI18n();
  const c = contentByLocale[locale];

  return (
    <div className="min-h-screen bg-[#f7f4f0] text-[#062427]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(6,36,39,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,36,39,0.08) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#062427] hover:opacity-75">
          <ArrowLeft className="h-4 w-4" />
          {c.back}
        </Link>

        <article className="mt-6 rounded-3xl border border-[#d9d4c9] bg-white/90 p-6 shadow-[0_18px_36px_rgba(6,36,39,0.10)] sm:p-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#062427]">{c.title}</h1>
          <p className="mt-2 text-sm text-[#4f6462]">{c.updated}</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#243a38] sm:text-base">
            {c.sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold text-[#062427]">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>{p}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
