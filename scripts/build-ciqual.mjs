/**
 * Converts the CIQUAL spreadsheet (ANSES, open data) into a compact JSON file.
 *
 * Run once, then commit data/ciqual.json - the seed script reads that, so the
 * 3.5 MB .xls never has to live in the repo or be re-downloaded.
 *
 *   node scripts/build-ciqual.mjs
 */
import fs from "node:fs";
import * as XLSX from "xlsx";

const SOURCE = "data/ciqual.xls";
const OUTPUT = "data/ciqual.json";

const COL = {
  code: "alim_code",
  name: "alim_nom_fr",
  group: "alim_ssgrp_nom_fr",
  kcal: "Energie, Règlement UE N° 1169/2011 (kcal/100 g)",
  protein: "Protéines, N x facteur de Jones (g/100 g)",
  carbs: "Glucides (g/100 g)",
  fat: "Lipides (g/100 g)",
  fiber: "Fibres alimentaires (g/100 g)",
};

/**
 * CIQUAL cells are French-formatted strings with analytical markers:
 * "12,4" is a value, "< 0,5" is below the detection limit, "traces" and "-"
 * mean none-or-unknown. Below-detection and traces both round to 0, which is
 * the right call for macros at this precision.
 */
function parseValue(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "" || s === "-") return null;
  if (s === "traces") return 0;
  if (s.startsWith("<")) return 0;

  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const workbook = XLSX.read(fs.readFileSync(SOURCE), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });

const foods = [];
let skipped = 0;

for (const row of rows) {
  const kcal = parseValue(row[COL.kcal]);
  const protein = parseValue(row[COL.protein]);
  const carbs = parseValue(row[COL.carbs]);
  const fat = parseValue(row[COL.fat]);
  const name = row[COL.name];

  // A food with no energy value is useless for a calorie tracker.
  if (!name || kcal == null || protein == null || carbs == null || fat == null) {
    skipped++;
    continue;
  }

  const round = (n) => Math.round(n * 10) / 10;

  foods.push({
    c: String(row[COL.code]),
    n: String(name).trim(),
    g: row[COL.group] ? String(row[COL.group]).trim() : null,
    k: round(kcal),
    p: round(protein),
    f: round(fat),
    b: round(carbs),
    fi: parseValue(row[COL.fiber]) != null ? round(parseValue(row[COL.fiber])) : null,
  });
}

fs.writeFileSync(OUTPUT, JSON.stringify(foods));

const sizeKb = Math.round(fs.statSync(OUTPUT).size / 1024);
console.log(`${foods.length} aliments écrits dans ${OUTPUT} (${sizeKb} Ko).`);
console.log(`${skipped} lignes ignorées (valeurs nutritionnelles manquantes).`);
