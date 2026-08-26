/**
 * Single-password session handling.
 *
 * Uses Web Crypto rather than node:crypto because this code also runs inside the
 * Next.js middleware, which executes on the Edge runtime where node:crypto is
 * unavailable.
 */
export const SESSION_COOKIE = "hfit_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days: log in once, stay in.

const encoder = new TextEncoder();

async function key(): Promise<CryptoKey> {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) throw new Error("ACCESS_PASSWORD is not set.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(value: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compare two strings without leaking their contents through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The session cookie is an HMAC of its own expiry timestamp. It holds nothing
 * secret and cannot be forged without the password.
 */
export async function issueToken(now: Date = new Date()): Promise<string> {
  const expires = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE;
  return `${expires}.${await sign(String(expires))}`;
}

export async function verifyToken(
  token: string | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  const [expiresRaw, sig] = token.split(".");
  if (!expiresRaw || !sig) return false;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < now.getTime()) return false;

  return safeEqual(sig, await sign(expiresRaw));
}

/** Constant-time password check, so the login endpoint cannot be timed. */
export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, process.env.ACCESS_PASSWORD ?? "");
}
