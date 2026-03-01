import {
  parseSelectedIndex,
  resolveStartTimeIdFromOptionMap,
} from "../src/whatsapp/handlers/selectTime.ts";

const optionMap = [
  { index: 1, startTimeId: "st-08" },
  { index: 2, startTimeId: "st-10" },
  { index: 3 },
];

function demoSelect(input: string) {
  const index = parseSelectedIndex(input);
  if (index === null) {
    return { input, ok: false, reason: "sem número" };
  }

  if (index < 1 || index > 8) {
    return { input, ok: false, reason: "fora do range 1..8", selectedIndex: index };
  }

  return {
    input,
    ok: true,
    selectedIndex: index,
    resolved: resolveStartTimeIdFromOptionMap(optionMap, index),
  };
}

console.log("Demo no-network: parseSelectedIndex + resolveStartTimeIdFromOptionMap");
console.log(JSON.stringify(demoSelect("2"), null, 2));
console.log(JSON.stringify(demoSelect("9"), null, 2));
console.log(JSON.stringify(demoSelect("oi"), null, 2));
