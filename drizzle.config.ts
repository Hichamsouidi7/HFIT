import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local automatically, but drizzle-kit runs outside Next and
// would otherwise only look at .env.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
