import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | null = null;

/**
 * The client is built on first use, not at import time.
 *
 * Next.js loads every route module during the build to collect metadata, so
 * connecting eagerly would make the build fail whenever DATABASE_URL is absent -
 * which is exactly the case on a fresh clone before the env file exists.
 */
function client(): Db {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL est absente. En local, mets-la dans .env.local ; en production, dans les variables d'environnement du projet Vercel.",
    );
  }

  instance = drizzle(neon(url), { schema });
  return instance;
}

export const db = new Proxy({} as Db, {
  get: (_target, prop) => Reflect.get(client(), prop),
});

export { schema };
