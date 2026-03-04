/**
 * Script para testar o fluxo do Dashboard:
 * 1. Lista tenants existentes
 * 2. Gera invite code para o primeiro tenant (ou cria um se nenhum existir)
 * 3. Mostra o invite code para usar no onboarding do frontend
 *
 * Uso: node --experimental-strip-types scripts/setupDashboardTest.ts
 */
import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";

async function main() {
  const url = process.env.CONVEX_URL;
  const serviceToken = process.env.CONVEX_SERVICE_TOKEN?.trim();
  if (!url) {
    throw new Error("CONVEX_URL não definido. Verifique .env.local.");
  }
  if (!serviceToken) {
    throw new Error("CONVEX_SERVICE_TOKEN não definido. Verifique .env.local.");
  }

  const client = new ConvexHttpClient(url);

  // 1. Listar tenants
  console.log("📋 Listando tenants...\n");
  const tenants = (await client.query("tenants:listTenantsForService" as any, { serviceToken })) as any[];

  if (tenants.length === 0) {
    console.log("⚠️  Nenhum tenant encontrado. Criando tenant de teste...\n");
    const tenantId = await client.mutation("tenants:createTenant" as any, {
      name: "Tenant Teste Dashboard",
      serviceToken,
    });
    console.log(`✅ Tenant criado: ${tenantId}\n`);

    const code = await client.mutation("tenants:generateInviteCodeForService" as any, {
      tenantId,
      serviceToken,
    });
    console.log("═══════════════════════════════════════════");
    console.log(`  INVITE CODE: ${code}`);
    console.log("═══════════════════════════════════════════");
    console.log("\nUse este código na página de onboarding do frontend.");
    return;
  }

  console.log(`Encontrado(s) ${tenants.length} tenant(s):\n`);
  for (const t of tenants) {
    console.log(`  - ${t.name} (${t._id}) [${t.status}] invite: ${t.inviteCode ?? "(sem código)"}`);
  }

  // 2. Gerar invite code para o primeiro tenant sem código
  const target = tenants.find((t: any) => !t.inviteCode) ?? tenants[0];
  console.log(`\n🔑 Gerando invite code para "${target.name}"...\n`);

  const code = await client.mutation("tenants:generateInviteCodeForService" as any, {
    tenantId: target._id,
    serviceToken,
  });

  console.log("═══════════════════════════════════════════");
  console.log(`  INVITE CODE: ${code}`);
  console.log(`  TENANT:      ${target.name}`);
  console.log("═══════════════════════════════════════════");
  console.log("\n📝 Passos para testar:");
  console.log("  1. cd frontend && npm run dev");
  console.log("  2. Acesse http://localhost:5173");
  console.log("  3. Faça signup/login");
  console.log("  4. Na tela de onboarding, digite o invite code acima");
  console.log("  5. Você será redirecionado para o dashboard");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
