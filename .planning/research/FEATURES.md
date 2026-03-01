# Feature Landscape

**Domain:** B2B SaaS -- WhatsApp chatbot for Bokun activity/tour vendors
**Researched:** 2026-03-01
**Focus Areas:** Vendor admin dashboard, subscription billing (Stripe), marketing landing page, profile/settings pages

## Table Stakes

Features vendors expect from any SaaS they pay for. Missing = vendors leave or never convert.

### Admin Dashboard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Conversation log / inbox | Vendors need to see what the bot said to their customers, audit responses, catch errors | Medium | Read-only view of `chat_messages` table filtered by tenant. Needs search, date filter, pagination. |
| Booking list with status | Vendors already see bookings in Bokun, but need to see which ones came through WhatsApp | Low | Pull from `bookings` table or Bokun API. Show confirmation code, status, customer phone, date. |
| Dashboard overview / KPIs | "Is this thing working?" -- message count, bookings made, conversion rate, response time | Medium | Aggregate queries on Convex. Show today/week/month. Charts optional for v1 -- numbers are enough. |
| WhatsApp channel status | Vendor must know if their WhatsApp number is connected and working | Low | Show `whatsapp_channels` record status. Green/red indicator. Connection instructions if missing. |
| Bot on/off toggle | Vendor must be able to pause the bot (maintenance, holidays, issues) | Low | Boolean flag on tenant or channel. Router checks before processing. |

### Subscription Billing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plan selection (pricing tiers) | Vendors need to choose a plan and pay | Medium | 2-3 tiers (e.g., Starter/Pro/Enterprise). Use Stripe Checkout Sessions for payment. |
| Self-service plan management | Change plan, cancel, update payment method without contacting support | Low | Use Stripe Customer Portal -- Stripe hosts the entire UI. Redirect vendor to portal link via API. Nearly zero custom code. |
| Invoice history | Vendors need receipts for accounting | Low | Stripe Customer Portal includes this. No custom build needed. |
| Trial period | Vendors will not pay before trying | Low | Stripe supports trial periods natively on subscriptions. 14-day free trial is standard. |
| Billing status in dashboard | Show current plan, next billing date, payment status | Low | Query Stripe API for subscription status. Display in settings page. |
| Grace period on failed payments | Do not cut off service immediately on failed payment | Low | Stripe Smart Retries handle this. Configure dunning in Stripe Dashboard (3 retry attempts over 7 days). |

### Landing Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hero with clear value prop | "Close bookings through WhatsApp without building a chatbot" -- under 8 words | Low | Static content. Headline + subheadline + CTA button. |
| Feature sections (3-4 key features) | Visitors need to understand what they get | Low | Icons + short descriptions. Automated booking, natural language, multi-tenant, Bokun integration. |
| Pricing section | B2B buyers self-qualify on price. Hiding prices loses qualified leads. | Low | Show tiers with feature comparison. Link each tier to Stripe Checkout or signup. |
| Social proof | Tour operators are risk-averse; they need validation from peers | Low | Testimonials, customer logos, "X bookings processed" counter. Can start with 1-2 early adopters. |
| CTA to Bokun marketplace install | Primary conversion action is installing via Bokun marketplace | Low | Button linking to Bokun marketplace listing. Secondary CTA: "Schedule a demo." |
| Mobile-responsive design | Tour operators check things on phones between tours | Low | Standard responsive CSS. Use a simple framework (Tailwind). |

### Profile / Settings

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Business info (name, logo, contact) | Bot uses business name in WhatsApp responses. Vendor needs to set this. | Low | Form saving to `tenants` table. Fields: businessName, logo URL, email, phone. |
| OpenAI API key configuration | Already exists. Vendor configures their own key. | Low | Already built. Keep as-is. |
| Bot persona / system prompt customization | Vendor wants the bot to sound like their brand, not generic | Medium | Textarea for custom instructions appended to system prompt. Character limit. Preview mode. |
| Timezone setting | Availability times must match vendor's timezone (currently hardcoded Europe/Madrid) | Low | Dropdown. Store on tenant. Use in availability formatting. |
| Language preference | Bot response language should match vendor's market | Low | Dropdown (PT/EN/ES for v1). Stored on tenant. Used in system prompt and hardcoded messages. |
| WhatsApp number management | Connect/disconnect WhatsApp number. View connection status. | Medium | Show current channel info. Instructions for Meta Business setup. Webhook URL display for copy. |

## Differentiators

Features that set this product apart from generic WhatsApp chatbot platforms. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One-click Bokun marketplace install | Zero-friction onboarding vs competitors that require manual API key setup. Vendor clicks "Install" in Bokun, OAuth handles everything. | Low | Already built (OAuth flow). This IS the moat. Landing page should emphasize it. |
| Deterministic booking flow (not pure LLM) | Booking reliability -- the state machine ensures bookings succeed. LLM handles only discovery/FAQ. Competitors use pure LLM which hallucinates. | Low | Already built. Market this heavily. "99% booking completion rate" angle. |
| Booking analytics by channel | "How many bookings came from WhatsApp vs your website vs OTAs?" -- Bokun vendors care about channel performance. | Medium | Requires tagging bookings with source channel in Bokun or local DB. Compare with Bokun dashboard data. |
| Handoff to human with context | Bot escalates to real person with full conversation history. Competitors either lack this or lose context. | Low | Already built (Telegram relay). Highlight in marketing. |
| Quick replies / interactive WhatsApp messages | Use WhatsApp interactive message types (buttons, lists) instead of plain text. Faster UX, fewer errors. | Medium | Meta Cloud API supports interactive messages. Requires refactoring message formatting in handlers. |
| Automated post-booking follow-up | Send reminder 24h before activity. Send "how was it?" after. Drives reviews and rebookings. | Medium | Requires scheduled message system. Convex cron + Bokun booking date lookup. |
| Multi-language bot responses | Bot detects customer language and responds accordingly. Tour operators serve international tourists. | High | LLM can handle this for the agent path. State machine messages need i18n extraction. Significant effort. |

## Anti-Features

Features to explicitly NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom dashboard analytics builder | Over-engineering. Vendors want simple KPIs, not Tableau. Building a flexible analytics engine is a black hole. | Show 5-6 fixed KPIs (messages today, bookings this week, conversion rate, avg response time). Hardcoded queries. |
| Per-booking commission billing | Complex to track, reconcile, and audit. Stripe usage-based billing adds significant complexity. Vendors prefer predictable costs. | Flat monthly subscription tiers. Simpler for vendor, simpler to implement, simpler to explain. |
| White-label / custom branding of bot messages | High effort, low value for v1. WhatsApp messages are plain text anyway. | Let vendors customize bot name and persona via system prompt. Logo only appears in profile pic (Meta Business handles this). |
| Multi-channel (SMS, Instagram, email) | Scope creep. WhatsApp + Telegram already supported. Adding more channels means more webhook handlers, more message formatting, more testing. | Stick to WhatsApp (primary) + Telegram (operator relay). Add channels only when WhatsApp revenue covers the investment. |
| Custom booking flow per vendor | Each vendor wants their flow slightly different. This path leads to a no-code flow builder, which is a product in itself. | Use Bokun as source of truth. The booking flow adapts to what Bokun returns (pickup required? questions required?). Vendor customizes via Bokun, not via this dashboard. |
| Role-based access control (RBAC) | Multi-user teams add complexity (invites, permissions, audit trails). Most Bokun vendors are small operators (1-3 people). | Single login per tenant for v1. Add team features only after PMF is confirmed and vendors ask for it. |
| Payment processing through the bot | Taking payments inside WhatsApp requires PCI compliance, payment links, refund flows. Bokun handles payments. | Bookings are "reserve for external payment" -- Bokun handles payment collection per the vendor's existing setup. |
| Native mobile app for vendors | Vendors manage from desktop. Mobile dashboard is nice-to-have but building a native app is massive scope. | Responsive web dashboard works on mobile browsers. Good enough for v1. |

## Feature Dependencies

```
Stripe Products/Prices setup  -->  Plan selection page
Plan selection page            -->  Stripe Checkout integration
Stripe Checkout integration    -->  Stripe Customer Portal (manage/cancel)
Stripe webhooks (payment)      -->  Billing status display in dashboard
Stripe webhooks (subscription) -->  Access control (block features if unpaid)

OAuth flow (exists)            -->  Tenant creation (exists)
Tenant creation                -->  Profile/settings page
Profile/settings page          -->  Bot persona customization
Profile/settings page          -->  Timezone + language settings

WhatsApp channel connection    -->  Conversation log display
Conversation log               -->  Dashboard KPIs (derived from same data)
Booking list                   -->  Dashboard KPIs (booking count, conversion)

Landing page (static)          -->  Independent, no backend dependency
Landing page pricing section   -->  Must match Stripe product/tier definitions
```

## MVP Recommendation

**Prioritize (launch blockers):**

1. **Stripe subscription billing** -- No revenue without this. Use Stripe Checkout + Customer Portal to minimize custom UI. Define 2 tiers (Starter: limited messages/month, Pro: unlimited). 14-day trial.
2. **Landing page with pricing** -- No signups without a public-facing page explaining the product. Static site, 5 sections (hero, features, how it works, pricing, CTA). Can be a single HTML page with Tailwind.
3. **Dashboard overview page** -- Vendor needs to see "is the bot working?" after install. Show: messages today, bookings this week, bot status (on/off), WhatsApp connection status.
4. **Profile/settings page** -- Business name, timezone, language, OpenAI key (already exists), bot toggle. Minimum viable configuration.
5. **Conversation log** -- Vendors will want to audit what the bot told their customers. Read-only message history with search.

**Defer (post-launch):**

- **Booking analytics by channel**: Requires Bokun API integration for cross-channel comparison. Build after core dashboard is stable.
- **Quick replies / interactive WhatsApp messages**: Improves UX but not a launch blocker. Bot works with plain text today.
- **Automated post-booking follow-up**: Needs scheduled message system. Build after vendors confirm demand.
- **Multi-language bot responses**: High complexity. LLM path already handles this somewhat. State machine i18n is significant work.
- **Bot persona customization**: Nice-to-have. Vendors can live with the default persona at launch.

## Pricing Tier Recommendation

Based on competitor analysis and the Bokun vendor market:

| Tier | Price | Target | Includes |
|------|-------|--------|----------|
| **Starter** | ~EUR 29/month | Small operators (1-2 activities) | Up to 500 messages/month, 1 WhatsApp number, basic dashboard |
| **Pro** | ~EUR 79/month | Active operators (3-10 activities) | Unlimited messages, conversation history, analytics, priority support |
| **Enterprise** | Custom | Large operators / chains | Multiple WhatsApp numbers, SLA, dedicated onboarding, custom integrations |

Annual billing discount: 2 months free (pay 10, get 12). Standard SaaS practice.

## Sources

- [Stripe SaaS Subscription Guide](https://stripe.com/resources/more/saas-subscription-models-101-a-guide-for-getting-started)
- [Stripe Customer Portal Documentation](https://docs.stripe.com/customer-management)
- [Stripe Build Subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Stripe SaaS Billing Best Practices](https://stripe.com/resources/more/best-practices-for-saas-billing)
- [Bokun.io](https://www.bokun.io/) -- Competitor/partner feature set
- [B2B SaaS Landing Page Best Practices (Instapage)](https://instapage.com/blog/b2b-landing-page-best-practices)
- [SaaS Landing Page Best Practices (SaaS Hero)](https://www.saashero.net/design/saas-landing-page-best-practices/)
- [Top WhatsApp Chatbots 2026 (Respond.io)](https://respond.io/blog/best-whatsapp-chatbots)
- [Tour Operator Software (Capterra)](https://www.capterra.com/tour-operator-software/)

---

*Feature landscape research: 2026-03-01*
