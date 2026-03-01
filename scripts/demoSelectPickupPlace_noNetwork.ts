import {
  parseSelectedIndex,
  resolvePickupPlaceIdFromOptionMap,
} from "../src/whatsapp/handlers/selectPickupPlace.ts";

const optionMap = [
  { index: 1, pickupPlaceId: "pk-1" },
  { index: 2, pickupPlaceId: "pk-2" },
  { index: 3 },
];

function demoCase(input: string) {
  const selectedIndex = parseSelectedIndex(input);
  if (selectedIndex === null) {
    return { input, ok: false, reason: "sem número" };
  }

  if (selectedIndex < 1 || selectedIndex > 8) {
    return { input, ok: false, reason: "fora do range 1..8", selectedIndex };
  }

  const resolved = resolvePickupPlaceIdFromOptionMap(optionMap, selectedIndex);
  return {
    input,
    ok: resolved.found && resolved.pickupPlaceId !== undefined,
    selectedIndex,
    resolved,
  };
}

console.log("Demo no-network: resolução de pickupPlaceId por índice");
console.log(JSON.stringify(demoCase("2"), null, 2));
console.log(JSON.stringify(demoCase("9"), null, 2));
console.log(JSON.stringify(demoCase("oi"), null, 2));
