---
status: complete
phase: 04-dashboard-landing-profile
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-03-03T00:00:00Z
updated: 2026-03-03T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Dashboard Overview Stats
expected: Navigate to /overview (after login). You see 4 cards in the top row: "Mensagens Hoje", "Reservas Esta Semana", "Status do Bot" (showing enabled/disabled), and "WhatsApp" (showing connection status). Cards display numeric counts or status labels.
result: pass

### 2. Bot Toggle
expected: On the Overview page, there is an on/off toggle switch for the bot. Clicking it changes bot status (enabled → disabled or vice versa). While toggling, the control is briefly disabled (loading state). The toggle reflects the new state after the mutation completes.
result: pass

### 3. Webhooks Sidebar Nav
expected: In the left sidebar, there is a "Webhooks" nav item (with an alert/triangle icon) positioned between Conversas and Atendimento. Clicking it navigates to /webhooks without a 404.
result: pass

### 4. Failed Webhooks Page
expected: The /webhooks page shows a table with columns: Tipo (source), Data/Hora, Motivo do erro, Hash, Tentativas, Status, Ações. Source badges are color-coded: WhatsApp = green, Bokun = blue. Status badges: "failed" = red, "retried" = yellow, "resolved" = green. Each row has a Retry button; it is disabled when status is "retried" or "resolved". If no records, shows "Nenhum webhook com falha registrado."
result: pass

### 5. Conversations Date Filter
expected: On the Conversations page, there are two date inputs labeled "De:" and "Até:". Entering dates filters the conversation list to that range. A "Limpar" button appears when at least one date is set; clicking it clears both date filters and resets the list.
result: pass

### 6. Conversations Pagination
expected: If there are more than 50 conversations, Prev/Next pagination buttons appear on the Conversations page. Clicking Next shows the next page of 50.
result: pass

### 7. Bookings Page Columns
expected: The Bookings page shows a table with at minimum these columns: confirmation code (Código), status, customer phone (Cliente/waUserId), and activity date (Data).
result: pass

### 8. Landing Page Public Access
expected: Navigating to / (root URL) — even without being logged in — shows a marketing landing page with a hero section containing a headline, a "Começar teste grátis" button, and a features section with 4 benefit cards (icons + titles + descriptions).
result: pass

### 9. Landing Page Pricing
expected: The landing page has a pricing section with two cards: Monthly at €29 and Annual at €290. The annual plan has a "Recomendado" badge. Both cards have a CTA button that initiates Stripe Checkout (or links to /api/create-checkout-session).
result: pass

### 10. Settings Perfil Tab
expected: In Settings, there is a "Perfil" tab with fields for: Nome da Empresa, Logo URL, Email de Contato, Timezone (dropdown), and Idioma/Language (dropdown). Filling in these fields and saving persists the values (they reappear on next load).
result: pass

### 11. Settings Assinatura Tab
expected: In Settings, there is an "Assinatura" tab showing current subscription status. There are buttons to start a Monthly or Annual Stripe Checkout subscription. Clicking a button redirects to Stripe Checkout (or shows an error if Stripe env vars are not configured).
result: pass

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
