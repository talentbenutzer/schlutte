import type {
  Commission,
  Employee,
  RecentDoc,
  Palette,
  Material,
} from "@/lib/types";

export const COMMISSIONS: Commission[] = [
  { no: "260050", client: "Familie Raitl", project: "Küche & Esszimmer", status: "in-progress", updated: "heute · 09:42", owner: "EDL", docs: 4 },
  { no: "260049", client: "Penthouse Basel", project: "Innenausbau Erdgeschoss", status: "in-progress", updated: "heute · 08:15", owner: "TMK", docs: 6 },
  { no: "260048", client: "Strähle GmbH", project: "Officewelten Verwaltung", status: "ready", updated: "gestern · 17:08", owner: "MWB", docs: 3 },
  { no: "260047", client: "Möhrlin", project: "Privathaus Garderobe", status: "shipped", updated: "14. Mai", owner: "JBR", docs: 5 },
  { no: "260046", client: "Boutique Eisenmann", project: "Ladenbau Innenstadt", status: "in-progress", updated: "13. Mai", owner: "EDL", docs: 2 },
  { no: "260042", client: "Praxis Dr. Kessler", project: "Empfang & Wartezone", status: "archived", updated: "02. Mai", owner: "LHR", docs: 7 },
];

export const EMPLOYEES: Employee[] = [
  { kuerzel: "EDL", name: "Eddy Lorenz", role: "Admin · Inhaber" },
  { kuerzel: "TMK", name: "Thomas Köhler", role: "Werkstatt" },
  { kuerzel: "MWB", name: "Marius Weber", role: "Werkstatt" },
  { kuerzel: "JBR", name: "Jonas Braun", role: "Büro" },
  { kuerzel: "LHR", name: "Lena Herr", role: "Büro" },
];

export const RECENT_DOCS: RecentDoc[] = [
  { type: "Laufzettel", kommission: "260050", client: "Familie Raitl", stamp: "heute · 09:42", by: "EDL" },
  { type: "Palette 3 / 5", kommission: "260049", client: "Penthouse Basel", stamp: "heute · 08:11", by: "TMK" },
  { type: "Palette 2 / 5", kommission: "260049", client: "Penthouse Basel", stamp: "heute · 08:09", by: "TMK" },
  { type: "Palette 1 / 5", kommission: "260049", client: "Penthouse Basel", stamp: "heute · 08:08", by: "TMK" },
  { type: "Laufzettel", kommission: "260048", client: "Strähle GmbH", stamp: "gestern · 16:50", by: "MWB" },
  { type: "Palette 1 / 3", kommission: "260047", client: "Möhrlin", stamp: "14. Mai · 11:20", by: "JBR" },
];

export const MATERIALS: Material[] = [
  { pos: "01", desc: "Korpus · Eiche massiv 19 mm", qty: "6 Stk", dim: "720 × 580 × 19" },
  { pos: "02", desc: "Front · Eiche furniert 22 mm", qty: "6 Stk", dim: "716 × 396 × 22" },
  { pos: "03", desc: "Boden · MDF schwarz 19 mm", qty: "6 Stk", dim: "716 × 552 × 19" },
  { pos: "04", desc: "Rückwand · HDF 8 mm geölt", qty: "6 Stk", dim: "716 × 552 × 8" },
  { pos: "05", desc: "Arbeitsplatte · Carrara C 30 mm", qty: "1 Stk", dim: "3.620 × 920 × 30" },
  { pos: "06", desc: "Griffleiste · Messing gebürstet", qty: "8 Lfm", dim: "— · L = variabel" },
];

export const STATIONS = [
  "Zuschnitt",
  "CNC · Bohrungen",
  "Kantenbearbeitung",
  "Furnier / Oberfläche",
  "Lackiererei",
  "Montage Korpus",
  "Endkontrolle",
  "Verpackung · Versand",
];

export const PALETTES: Palette[] = [
  { idx: 1, total: 5, content: "Korpora Unterschrank · Sockel · Verbinder", weight: "142 kg", dim: "120 × 80 × 110 cm", positions: ["01", "03", "04"] },
  { idx: 2, total: 5, content: "Fronten · Griffleisten Messing",            weight: "78 kg",  dim: "120 × 80 × 95 cm",  positions: ["02", "06"] },
  { idx: 3, total: 5, content: "Arbeitsplatte Carrara C · Wandanschluss",   weight: "298 kg", dim: "370 × 95 × 18 cm",  positions: ["05"] },
  { idx: 4, total: 5, content: "Hängeschränke · Lichtleisten",              weight: "64 kg",  dim: "120 × 80 × 80 cm",  positions: ["07", "08"] },
  { idx: 5, total: 5, content: "Beschläge · Montagezubehör · Restmaterial", weight: "36 kg",  dim: "80 × 60 × 60 cm",   positions: ["09", "10", "11"] },
];
