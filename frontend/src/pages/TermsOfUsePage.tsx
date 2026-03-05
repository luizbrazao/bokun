import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfUsePage() {
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#062427] hover:opacity-75"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <article className="mt-6 rounded-3xl border border-[#d9d4c9] bg-white/90 p-6 shadow-[0_18px_36px_rgba(6,36,39,0.10)] sm:p-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#062427]">
            Terms of Use
          </h1>
          <p className="mt-2 text-sm text-[#4f6462]">Last updated: August 2025</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#243a38] sm:text-base">
            <section>
              <h2 className="text-lg font-semibold text-[#062427]">1. Acceptance of Terms</h2>
              <p>
                By using the ChatPlug application, you agree to comply with and be bound by these Terms of Use. If
                you do not agree, we recommend that you do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">2. Services Provided</h2>
              <p>
                ChatPlug offers WhatsApp automation, including integration with Altegio, appointment management,
                automated responses, multilingual support, and performance reports.
              </p>
              <p className="mt-2">
                The service may include paid plans (Monthly and Annual) and additional features, depending on the
                selected subscription.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">3. Registration and Account</h2>
              <p>
                To access ChatPlug, you must create an account with accurate and up-to-date information. You are
                responsible for maintaining the confidentiality of your login credentials.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">4. Plans and Payments</h2>
              <p>
                ChatPlug offers a 7-day free trial. After this period, a paid plan is required. Pricing is available
                on the pricing page and may be billed monthly or annually.
              </p>
              <p className="mt-2">All payments are securely processed via Stripe. We do not store credit card data.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">5. Cancellation</h2>
              <p>
                You can cancel your subscription at any time. Cancellation stops auto-renewal but does not generate a
                prorated refund for the already paid period.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">6. Permitted Use</h2>
              <p>
                ChatPlug must be used only for lawful purposes and in compliance with applicable laws. Using the
                service to send spam, commit fraud, or engage in illicit activities is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">7. Privacy and Security</h2>
              <p>
                Your data is processed in accordance with our Privacy Policy. We use encryption and follow security
                best practices to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">8. Changes to the Terms</h2>
              <p>
                ChatPlug may update these Terms of Use periodically. Changes will take effect once published on this
                page, with the update date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">9. Limitation of Liability</h2>
              <p>
                ChatPlug is not responsible for external failures such as WhatsApp, Altegio, or third-party service
                outages, nor for indirect damages resulting from the use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#062427]">10. Contact</h2>
              <p>
                If you have questions about these Terms, contact us at{" "}
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
