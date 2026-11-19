import { z } from "zod";

/**
 * Every environment variable the API needs, checked once at startup.
 *
 * Why: if DATABASE_URL is missing, you want the app to refuse to start with a
 * clear message, not to crash 10 minutes later on the first query. Add new
 * variables here as later phases need them (JWT_SECRET in Phase 2,
 * REDIS_URL in Phase 7, MONGO_URL in Phase 8, ...).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith("postgres://", "DATABASE_URL must start with postgres://"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  console.error("Did you copy api/.env.example to api/.env?");
  process.exit(1);
}

export const config = parsed.data;
export const isDev = config.NODE_ENV === "development";
