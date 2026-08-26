/**
 * Seeds the food catalogue.
 *
 * Two sources:
 *  - CIQUAL (ANSES open data), the reference table for raw and home-cooked
 *    French foods. Built into data/ciqual.json by scripts/build-ciqual.mjs.
 *  - A short supplement of staples CIQUAL 2020 predates or does not carry
 *    (skyr, whey, high-protein dairy), which are exactly what a high-protein
 *    cut runs on.
 *
 *   npm run seed:ciqual
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import fs from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { foods } from "../src/db/schema";
import { normalizeForSearch } from "../src/lib/search";

interface CiqualFood {
  c: string;
  n: string;
  g: string | null;
  k: number;
  p: number;
  f: number;
  b: number;
  fi: number | null;
}

/** name, kcal, protein, fat, carbs, default portion (g), portion label */
const STAPLES: [string, number, number, number, number, number, string | null][] = [
  ["Skyr nature 0%", 63, 11, 0.2, 4, 150, "1 pot"],
  ["Fromage blanc 0%", 47, 8, 0.2, 4, 100, null],
  ["Yaourt grec 0%", 57, 10, 0.4, 4, 150, "1 pot"],
  ["Whey protéine (poudre)", 380, 80, 5, 5, 30, "1 dose"],
  ["Flocons d'avoine", 375, 13, 7, 60, 40, "1 portion"],
  ["Blanc de poulet, cru", 108, 23, 1.5, 0, 150, "1 filet"],
  ["Blanc de poulet, grillé", 148, 31, 2.5, 0, 150, "1 filet"],
  ["Blanc de dinde, cru", 105, 24, 1, 0, 150, null],
  ["Steak haché 5% MG, cru", 121, 21, 4.5, 0, 125, "1 steak"],
  ["Thon au naturel, égoutté", 116, 26, 1, 0, 140, "1 boîte"],
  ["Blanc d'oeuf", 48, 10.8, 0.2, 0.7, 33, "1 blanc"],
  ["Tofu ferme nature", 145, 16, 8.7, 1.5, 100, null],
  ["Lentilles corail, crues", 350, 24, 1.5, 56, 60, "1 portion"],
  ["Galette de riz soufflé", 380, 8, 3, 80, 9, "1 galette"],
  ["Konjac (pâtes/riz)", 8, 0.2, 0, 3, 200, "1 sachet"],
];

async function main() {
  const raw = fs.readFileSync("data/ciqual.json", "utf8");
  const ciqual = JSON.parse(raw) as CiqualFood[];

  console.log(`Lecture de ${ciqual.length} aliments CIQUAL...`);

  const rows = [
    ...ciqual.map((f) => ({
      source: "ciqual",
      externalId: f.c,
      name: f.n,
      searchName: normalizeForSearch(f.n),
      kcal100: f.k,
      protein100: f.p,
      fat100: f.f,
      carbs100: f.b,
      fiber100: f.fi,
      defaultPortionG: 100,
    })),
    ...STAPLES.map(([name, kcal, protein, fat, carbs, portion, label]) => ({
      source: "staple",
      externalId: null,
      name,
      searchName: normalizeForSearch(name),
      kcal100: kcal,
      protein100: protein,
      fat100: fat,
      carbs100: carbs,
      fiber100: null,
      defaultPortionG: portion,
      portionLabel: label,
    })),
  ];

  // Wipe only the seeded rows: anything he scanned, photographed or typed
  // himself has to survive a re-seed.
  await db.delete(foods).where(sql`${foods.source} in ('ciqual', 'staple')`);

  // Neon caps how much can go in a single statement, so insert in chunks.
  const CHUNK = 400;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(foods).values(rows.slice(i, i + CHUNK));
    process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)} / ${rows.length}`);
  }

  console.log(`\n${rows.length} aliments en base (${STAPLES.length} ajoutés à la main).`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
