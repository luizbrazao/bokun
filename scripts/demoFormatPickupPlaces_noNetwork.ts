import { formatPickupPlaces } from "../src/whatsapp/formatPickupPlaces.ts";

const fixture = [
  { id: "pk-1", title: "Hotel Central", address: "Av. Principal, 100" },
  { id: "pk-2", title: "Praça do Porto", address: "Praça da Marina" },
  { id: "pk-3", title: "Terminal Norte" },
];

const formatted = formatPickupPlaces({
  activityTitle: "Passeio de Barco Premium",
  options: fixture,
});

console.log(formatted.text);
console.log(JSON.stringify(formatted.pickupOptionMap, null, 2));
