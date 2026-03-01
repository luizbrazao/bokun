/**
 * Register the Telegram webhook URL with the Bot API.
 *
 * Usage:
 *   node --experimental-strip-types --env-file=.env.local scripts/setupTelegramWebhook.ts
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN     — Bot token from @BotFather
 *   WEBHOOK_BASE_URL       — Public URL (e.g. https://abc.ngrok-free.app)
 *   TELEGRAM_WEBHOOK_SECRET — Secret token for webhook validation
 *   TELEGRAM_BOT_USERNAME  — Bot username (without @)
 */

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const baseUrl = process.env.WEBHOOK_BASE_URL?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN ausente.");
  process.exit(1);
}
if (!baseUrl) {
  console.error("WEBHOOK_BASE_URL ausente (ex: https://abc.ngrok-free.app).");
  process.exit(1);
}
if (!secret) {
  console.error("TELEGRAM_WEBHOOK_SECRET ausente.");
  process.exit(1);
}
if (!botUsername) {
  console.error("TELEGRAM_BOT_USERNAME ausente.");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/telegram/webhook/${botUsername}`;

console.log("Registrando webhook Telegram...");
console.log(`  Bot: @${botUsername}`);
console.log(`  URL: ${webhookUrl}`);

const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
  }),
});

const data = await response.json();
console.log("\nResposta Telegram:", JSON.stringify(data, null, 2));

if (data.ok) {
  console.log("\nWebhook registrado com sucesso!");
} else {
  console.error("\nFalha ao registrar webhook.");
  process.exit(1);
}
