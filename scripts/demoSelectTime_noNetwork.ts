import { resolveStartTimeIdFromOptionMap } from "../src/whatsapp/handlers/selectTime.ts";

const conversation = {
  lastOptionMap: [
    { index: 1, startTimeId: "st-08" },
    { index: 2, startTimeId: "st-10" },
    { index: 3 },
  ],
};

function parseSelectedIndex(text: string): number | null {
  const match = text.match(/(\d+)/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function demoCase(input: string) {
  const parsed = parseSelectedIndex(input);
  if (parsed === null) {
    return {
      input,
      ok: false,
      reason: "sem número",
    };
  }

  if (parsed < 1 || parsed > 8) {
    return {
      input,
      ok: false,
      reason: "fora do range 1..8",
      selectedIndex: parsed,
    };
  }

  const resolved = resolveStartTimeIdFromOptionMap(conversation.lastOptionMap, parsed);
  return {
    input,
    ok: resolved.found && resolved.startTimeId !== undefined,
    selectedIndex: parsed,
    resolved,
  };
}

console.log("Demo no-network: resolução de startTimeId por índice");
console.log(JSON.stringify(demoCase("2"), null, 2));
console.log(JSON.stringify(demoCase("9"), null, 2));
console.log(JSON.stringify(demoCase("oi"), null, 2));
