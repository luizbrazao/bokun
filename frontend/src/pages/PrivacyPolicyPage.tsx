import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#062427] hover:opacity-75"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </a>

        <article className="mt-6 rounded-3xl border border-[#d9d4c9] bg-white/90 p-6 shadow-[0_18px_36px_rgba(6,36,39,0.10)] sm:p-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#062427]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[#4f6462]">Last updated: August 2025</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#243a38] sm:text-base">
            <section>
              <h2 className="text-lg font-semibold text-[#062427]">1. Introduction</h2>
              <p>
                This Privacy Policy explains how ChatPlug collects, uses, stores, and protects users’ personal
                information. By using our services, you agree to the practices described below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">2. Information We Collect</h2>
              <p>We may collect the following information:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Name, email, and phone provided during signup</li>
                <li>Payment data (securely processed via Stripe)</li>
                <li>Messages and interactions made through WhatsApp</li>
                <li>Usage information such as IP address and access logs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">3. How We Use Data</h2>
              <p>We use your information to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Provide and operate our services</li>
                <li>Process payments and subscriptions</li>
                <li>Send important notifications and communications</li>
                <li>Improve user experience and optimize features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">4. Data Sharing</h2>
              <p>We do not sell or rent your personal information. Your data may be shared only with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Payment providers (Stripe)</li>
                <li>Integration partners, such as Altegio and Z-API</li>
                <li>Legal authorities when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">5. Security</h2>
              <p>
                We implement technical and organizational security measures to protect your information, including
                encryption and GDPR compliance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">6. Users’ Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Access and correct your personal information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">7. Data Retention</h2>
              <p>
                We retain your information only as long as necessary for the purposes described in this policy,
                unless longer periods are required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will publish the revised version on this page with
                the update date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">9. Contact</h2>
              <p>
                If you have any questions about this Privacy Policy, contact us at{" "}
                <a href="mailto:info@iaoperators.com" className="font-semibold underline decoration-[#d4ff3f] underline-offset-2">
                  info@iaoperators.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
