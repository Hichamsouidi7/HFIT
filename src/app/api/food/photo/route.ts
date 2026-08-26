import { NextResponse } from "next/server";
import { GeminiUnavailable, generateJSON, isConfigured } from "@/lib/gemini";

/**
 * Estimates what is on a plate from a photo.
 *
 * This is the feature that decides whether a food diary survives three weeks:
 * typing every meal is what makes people stop on day four. The estimate does
 * not need to be perfect — it needs to be close enough that correcting it is
 * one tap, which is why every item comes back with an editable weight.
 */

export const maxDuration = 45;

const SCHEMA = {
  type: "object",
  properties: {
    dish: { type: "string" },
    confidence: { type: "string", enum: ["haute", "moyenne", "basse"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantityG: { type: "number" },
          kcal: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          carbsG: { type: "number" },
        },
        required: ["name", "quantityG", "kcal", "proteinG", "fatG", "carbsG"],
      },
    },
    note: { type: "string" },
  },
  required: ["dish", "confidence", "items"],
} as const;

const SYSTEM = `Tu es un nutritionniste qui estime le contenu d'une assiette à partir d'une photo.

Règles :
- Décompose le plat en aliments distincts (protéine, féculent, légumes, sauce, matière grasse visible).
- Estime le poids de chaque aliment EN GRAMMES, tel qu'il est dans l'assiette (donc cuit si c'est cuit).
- Sers-toi des repères visibles pour l'échelle : diamètre d'assiette (~26 cm), couverts, verre, main.
- N'oublie jamais l'huile ou le beurre de cuisson s'ils sont plausibles : c'est l'erreur la plus coûteuse.
- Les macros doivent être cohérentes : kcal ≈ protéines×4 + lipides×9 + glucides×4.
- Tous les noms d'aliments sont en français.
- Si la photo ne montre pas de nourriture, renvoie une liste d'items vide et explique-le dans "note".
- Dans "note", signale en une phrase courte ce qui est incertain (sauce cachée, quantité difficile à juger).`;

interface Body {
  image?: string;
  mimeType?: string;
  hint?: string;
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "L'IA n'est pas configurée : ajoute GEMINI_API_KEY dans les variables Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as Body;
  const raw = body.image ?? "";
  const data = raw.includes(",") ? raw.split(",")[1] : raw;

  if (!data || data.length < 100) {
    return NextResponse.json({ error: "Photo manquante ou illisible." }, { status: 400 });
  }
  // ~8 MB of base64. The client compresses well below this; the check is here
  // so a rogue payload cannot burn the whole quota in one call.
  if (data.length > 8_000_000) {
    return NextResponse.json({ error: "Photo trop lourde." }, { status: 413 });
  }

  const prompt = body.hint?.trim()
    ? `Analyse cette assiette. Indice donné par l'utilisateur : « ${body.hint.trim()} ».`
    : "Analyse cette assiette et estime chaque aliment.";

  try {
    const result = await generateJSON<{
      dish: string;
      confidence: string;
      items: {
        name: string;
        quantityG: number;
        kcal: number;
        proteinG: number;
        fatG: number;
        carbsG: number;
      }[];
      note?: string;
    }>({
      prompt,
      images: [{ data, mimeType: body.mimeType ?? "image/jpeg" }],
      schema: SCHEMA as unknown as Record<string, unknown>,
      systemInstruction: SYSTEM,
      temperature: 0.2,
    });

    // The model occasionally returns macros that do not add up to its own kcal.
    // Trust the macros — they are what the day's targets are measured against —
    // and recompute the energy from them.
    const items = (result.items ?? [])
      .filter((i) => i.name && i.quantityG > 0)
      .map((i) => {
        const proteinG = Math.max(0, Math.round(i.proteinG));
        const fatG = Math.max(0, Math.round(i.fatG));
        const carbsG = Math.max(0, Math.round(i.carbsG));
        return {
          name: i.name,
          quantityG: Math.round(i.quantityG),
          proteinG,
          fatG,
          carbsG,
          kcal: proteinG * 4 + fatG * 9 + carbsG * 4,
        };
      });

    return NextResponse.json({
      dish: result.dish,
      confidence: result.confidence,
      note: result.note ?? null,
      items,
    });
  } catch (error) {
    if (error instanceof GeminiUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Analyse impossible. Réessaie." }, { status: 500 });
  }
}
