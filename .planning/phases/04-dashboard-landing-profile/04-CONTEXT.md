# Phase 4: Dashboard, Landing Page & Profile - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the vendor admin UI (bot monitoring, toggle, conversation search, failed webhooks view), build a marketing landing page for prospect acquisition, and add profile/billing settings so vendors can configure their business and manage their subscription via Stripe. Core bot logic is already built — this phase is the commercial frontend layer.

</domain>

<decisions>
## Implementation Decisions

### Landing Page — Hero & Messaging
- **Hero headline:** "Converta conversas do WhatsApp em reservas confirmadas no Bokun."
- **Subheadline:** "Instale uma vez, conecte seu WhatsApp e deixe o bot capturar horário, pickup e participantes — com confirmação e logs."
- **Primary CTA:** "Começar teste grátis" — routes to Bokun marketplace install for existing Bokun users
- **Secondary CTA:** "Ver como funciona" — anchor scroll to features section below the fold

### Landing Page — 4 Benefit Features
1. **Reservas 24/7 no WhatsApp** — bot atende clientes a qualquer hora, sem agente humano
2. **Integração nativa com Bokun** — instala via marketplace, sem configuração técnica
3. **Menos erros e mais conversão** — fluxo guiado captura horário, pickup e participantes com precisão
4. **Controle e auditoria** — dashboard com logs de conversa, lista de reservas e retry de webhooks falhos

### Landing Page — Pricing
- **Monthly:** €29/mês
- **Annual:** €290/ano (≈2 meses grátis)
- **Free trial:** 7 dias incluídos em ambos os planos
- Pricing section links each tier directly to Stripe Checkout

### Dashboard — Overview Metrics
- **Primary metrics (top row, required — DASH-01):** Mensagens hoje, Reservas esta semana, Status do bot (on/off badge), Indicador de conexão WhatsApp
- **Secondary metrics (Insights section below):** Confirmadas, Pendentes, Conversas totais, Taxa de conversão — preserved from existing UI but visually subordinate
- Existing KPI cards are NOT removed; they move to a secondary "Insights" section

### Dashboard — Bot Toggle
- Toggle lives **on the Overview page, prominently in the top area** — not buried in Settings
- Visual design: clear on/off switch adjacent to the bot status metric card
- Toggle state persists via Convex and webhook router respects it immediately (DASH-02)

### Settings — New Tabs
- Add **"Perfil"** tab to existing Settings page: business name, logo URL, contact email, timezone selector, language selector (PT/EN/ES)
- Add **"Assinatura"** tab to existing Settings page: current plan name, status (active/trial/past_due/cancelled), trial end date, next billing date, and a Stripe Checkout button to subscribe or upgrade

### Billing Flow
- Stripe-hosted Checkout for plan selection (monthly or annual), with 07-day trial automatically applied
- After Checkout success: redirect back to `/configuracoes` (Assinatura tab) with success state shown
- After Checkout cancel: redirect back to same page with neutral state (no error, just back to subscription view)

### Settings — IA (OpenAI Key per Tenant)
- Each vendor provides their own OpenAI API key
- Key is stored per-tenant and never logged
- Dashboard must show key status (configured / missing / invalid)
- Include "Test key" button
- Platform does not pay LLM costs

### Failed Webhooks UI
- Exposed as a **sidebar nav item "Webhooks"** (ops area — alongside Visão Geral, Reservas, Conversas, Atendimento)
- **Retry UX:** per-row Retry button — no bulk retry in Phase 4
- Table shows: webhook type (WhatsApp/Bokun/Stripe), timestamp, error reason, partial payload hash, retry status

### Claude's Discretion
- Exact layout/spacing of the landing page sections
- Icon choices for the 4 benefit features
- Color palette for landing page (may differ from dashboard — can use brand accent)
- Skeleton loading states for new pages
- Exact wording of subscription status badges and trial countdown
- Sidebar icon for "Webhooks" nav item

</decisions>

<specifics>
## Specific Ideas

- Landing page is a separate publicly accessible route (e.g. `/`) while the dashboard lives under auth-protected routes — they can share the same React build or be separate; planner decides
- The Stripe Checkout integration uses the Stripe webhook already wired in Phase 3 — no new backend needed for Phase 4, just the frontend Checkout redirect + success/cancel URL handling
- Existing settings tabs (WhatsApp, Telegram, Bokun, IA, Equipe) stay as-is; "Perfil" and "Assinatura" are appended

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-dashboard-landing-profile*
*Context gathered: 2026-03-03*
