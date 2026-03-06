import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { type Locale, useI18n } from "@/i18n";

type Section = { title: string; body: string[] };

const contentByLocale: Record<Locale, { title: string; updated: string; sections: Section[]; back: string }> = {
  pt: {
    title: "Política de Privacidade",
    updated: "Última atualização: março de 2026",
    back: "Voltar para a landing",
    sections: [
      { title: "1. Introdução", body: ["Esta Política explica como a ChatPlug coleta, utiliza, armazena e protege dados pessoais ao usar a plataforma."] },
      { title: "2. Dados coletados", body: ["Podemos coletar nome, e-mail, telefone, dados de uso e metadados de mensagens para operar o serviço."] },
      { title: "3. Finalidade", body: ["Usamos os dados para autenticação, operação do produto, suporte, faturamento e melhoria contínua."] },
      { title: "4. Compartilhamento", body: ["Não vendemos dados pessoais. Compartilhamento ocorre apenas com provedores necessários (ex.: Stripe, WhatsApp) e quando exigido por lei."] },
      { title: "5. Segurança", body: ["Aplicamos controles técnicos e organizacionais, incluindo criptografia em trânsito e práticas de acesso mínimo."] },
      { title: "6. Direitos do titular", body: ["Você pode solicitar acesso, correção, exclusão e portabilidade conforme legislação aplicável."] },
      { title: "7. Retenção", body: ["Mantemos dados apenas pelo tempo necessário para finalidades legítimas, contratuais e legais."] },
      { title: "8. Alterações", body: ["Podemos atualizar esta Política periodicamente. A versão vigente será publicada nesta página."] },
      { title: "9. Contato", body: ["Dúvidas: info@iaoperators.com"] },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: March 2026",
    back: "Back to home",
    sections: [
      { title: "1. Introduction", body: ["This Policy explains how ChatPlug collects, uses, stores, and protects personal data while using the platform."] },
      { title: "2. Data we collect", body: ["We may collect name, email, phone, usage data, and message metadata required to operate the service."] },
      { title: "3. Purpose", body: ["We use data for authentication, product operations, support, billing, and continuous improvement."] },
      { title: "4. Data sharing", body: ["We do not sell personal data. Sharing happens only with required providers (e.g., Stripe, WhatsApp) and when legally required."] },
      { title: "5. Security", body: ["We apply technical and organizational controls, including in-transit encryption and least-privilege access."] },
      { title: "6. Data subject rights", body: ["You may request access, correction, deletion, and portability according to applicable law."] },
      { title: "7. Retention", body: ["We keep data only for as long as needed for legitimate, contractual, and legal purposes."] },
      { title: "8. Changes", body: ["We may update this Policy periodically. The current version is published on this page."] },
      { title: "9. Contact", body: ["Questions: info@iaoperators.com"] },
    ],
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: marzo de 2026",
    back: "Volver al inicio",
    sections: [
      { title: "1. Introducción", body: ["Esta Política explica cómo ChatPlug recopila, utiliza, almacena y protege datos personales al usar la plataforma."] },
      { title: "2. Datos recopilados", body: ["Podemos recopilar nombre, email, teléfono, datos de uso y metadatos de mensajes necesarios para operar el servicio."] },
      { title: "3. Finalidad", body: ["Usamos los datos para autenticación, operación del producto, soporte, facturación y mejora continua."] },
      { title: "4. Compartición", body: ["No vendemos datos personales. Solo compartimos con proveedores necesarios (p. ej., Stripe, WhatsApp) o por obligación legal."] },
      { title: "5. Seguridad", body: ["Aplicamos controles técnicos y organizativos, incluyendo cifrado en tránsito y acceso de mínimo privilegio."] },
      { title: "6. Derechos del titular", body: ["Puedes solicitar acceso, corrección, eliminación y portabilidad según la normativa aplicable."] },
      { title: "7. Retención", body: ["Conservamos datos solo durante el tiempo necesario para fines legítimos, contractuales y legales."] },
      { title: "8. Cambios", body: ["Podemos actualizar esta Política periódicamente. La versión vigente se publicará en esta página."] },
      { title: "9. Contacto", body: ["Consultas: info@iaoperators.com"] },
    ],
  },
};

export default function PrivacyPolicyPage() {
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
