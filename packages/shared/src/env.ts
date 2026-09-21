import { z } from "zod";

/** Flip only after the owner records APPROVED for the relevant providers in docs/SOURCE_PERMISSIONS.md. */
export const LIVE_MODE_APPROVED = false;

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  GITHUB_TOKEN: z.string().optional(),
  /** AI features. Off until the owner approves a provider and budgets (Q5, Q26). */
  AI_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * RECORDED uses sanitized local snapshots only. LIVE is refused until every source permission
   * is approved (docs/SOURCE_PERMISSIONS.md); it cannot be enabled by configuration alone.
   */
  DATA_MODE: z.enum(["recorded", "live"]).default("recorded"),
  /** Live fetching of external sources. Providers are pending until approved (DATA_POLICY.md). */
  INGESTION_LIVE_SOURCES: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment: ${fields}`);
  }
  if (parsed.data.DATA_MODE === "live" && !LIVE_MODE_APPROVED) {
    throw new Error(
      "DATA_MODE=live is disabled: no source is approved yet (docs/SOURCE_PERMISSIONS.md)",
    );
  }
  if (parsed.data.INGESTION_LIVE_SOURCES && !LIVE_MODE_APPROVED) {
    throw new Error(
      "INGESTION_LIVE_SOURCES=true is disabled: no source is approved yet (docs/SOURCE_PERMISSIONS.md)",
    );
  }
  return parsed.data;
}

export function requireDatabaseUrl(env: Env): string {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return env.DATABASE_URL;
}
