import { GoogleGenAI } from "@google/genai";

/**
 * Gemini client.
 *
 * Two things this file exists to guarantee:
 *
 *  1. The key never leaves the server. Every caller is a route handler.
 *  2. The app degrades instead of breaking. Free-tier quotas run out, and model
 *     names get retired — so the model is discovered at runtime from the API's
 *     own model list rather than hard-coded, and a quota error falls through to
 *     the next candidate instead of showing a broken screen.
 */

/** Preference order. Matched as prefixes against whatever the API reports. */
const PREFERRED = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

/** Cheaper tier, tried once the preferred models are rate-limited. */
const LITE = ["gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"];

let cachedChain: string[] | null = null;

function ai(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUnavailable(
      "La clé GEMINI_API_KEY n'est pas configurée. Ajoute-la dans les variables d'environnement Vercel.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

/** Raised for anything the user can act on; the API routes turn it into French. */
export class GeminiUnavailable extends Error {}

/**
 * Asks the API which models actually exist, then orders them by preference.
 * Falls back to the static lists if the listing call fails, so a hiccup in
 * discovery never blocks a generation.
 */
async function modelChain(): Promise<string[]> {
  if (cachedChain) return cachedChain;

  let available: string[] = [];
  try {
    const pager = await ai().models.list();
    for await (const model of pager) {
      const name = (model.name ?? "").replace(/^models\//, "");
      const actions = model.supportedActions;
      if (name && (!actions || actions.includes("generateContent"))) available.push(name);
    }
  } catch {
    available = [];
  }

  const pick = (candidates: string[]) =>
    candidates.filter((c) => available.length === 0 || available.some((a) => a.startsWith(c)));

  const chain = [...pick(PREFERRED), ...pick(LITE)];
  cachedChain = chain.length > 0 ? chain : [...PREFERRED, ...LITE];
  return cachedChain;
}

function isQuotaOrMissing(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error);
  return /429|quota|RESOURCE_EXHAUSTED|404|NOT_FOUND|is not found/i.test(message);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ImagePart {
  /** Base64 payload without the data: prefix. */
  data: string;
  mimeType: string;
}

export interface GenerateOptions {
  prompt: string;
  images?: ImagePart[];
  /** JSON schema the reply must satisfy. Omit for free text. */
  schema?: Record<string, unknown>;
  systemInstruction?: string;
  temperature?: number;
}

/**
 * One generation, with model fallback and backoff.
 *
 * Every model in the chain gets two attempts; a quota or missing-model error
 * moves to the next model rather than retrying a door that will stay shut.
 */
export async function generate({
  prompt,
  images,
  schema,
  systemInstruction,
  temperature = 0.4,
}: GenerateOptions): Promise<string> {
  const chain = await modelChain();
  const client = ai();

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const image of images ?? []) {
    parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
  }

  let lastError: unknown = null;

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            temperature,
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(schema
              ? { responseMimeType: "application/json", responseSchema: schema }
              : {}),
          },
        });

        const text = response.text;
        if (text && text.trim()) return text;
        throw new Error("Réponse vide du modèle.");
      } catch (error) {
        lastError = error;
        if (isQuotaOrMissing(error)) break; // next model
        await sleep(600 * (attempt + 1));
      }
    }
  }

  throw new GeminiUnavailable(
    isQuotaOrMissing(lastError)
      ? "Le quota gratuit de l'IA est épuisé pour le moment. Réessaie dans quelques minutes."
      : "L'IA n'a pas répondu. Réessaie dans un instant.",
  );
}

/** Same as generate, but parses the reply as JSON. */
export async function generateJSON<T>(options: GenerateOptions): Promise<T> {
  const raw = await generate(options);

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Models occasionally wrap JSON in a code fence despite the mime type.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new GeminiUnavailable("L'IA a renvoyé une réponse illisible. Réessaie.");
  }
}

export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
