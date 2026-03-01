const payload = {
  tenantId: "TENANT_ID_EXEMPLO",
  waUserId: "WA_USER_123",
  activityId: 123,
  date: "2026-02-16",
  optionMap: [
    { index: 1, startTimeId: "st-08" },
    { index: 2, startTimeId: "st-10" },
    { index: 3 },
  ],
};

console.log("Demo no-network: payload que seria salvo no Convex (sem chamada de rede).");
console.log(JSON.stringify(payload, null, 2));
