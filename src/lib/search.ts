/**
 * Normalisation used by the food search, shared by the seed script and the
 * query layer so the stored text and the typed query are always shaped alike.
 *
 * Lowercases, strips accents, and turns every run of punctuation into a single
 * space. That last part is what makes word-boundary matching work: "Blanc
 * d'oeuf" becomes "blanc d oeuf", so a search for "oeuf" hits it, while "boeuf
 * bourguignon" stays "boeuf bourguignon" and does not.
 */
export function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * French plurals are mostly a trailing "s", and CIQUAL names are singular
 * ("Lentille, cuite") while people type plurals ("lentilles"). Returns the
 * variants worth trying, longest first.
 */
export function searchVariants(query: string): string[] {
  const q = normalizeForSearch(query);
  if (!q) return [];

  const variants = new Set([q]);

  const words = q.split(" ");
  const last = words[words.length - 1];
  if (last.length > 3 && last.endsWith("s")) {
    variants.add([...words.slice(0, -1), last.slice(0, -1)].join(" "));
  }

  return [...variants];
}
