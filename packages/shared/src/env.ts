import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/** Flip only after the owner records APPROVED for the relevant providers in docs/SOURCE_PERMISSIONS.md. */
export const LIVE_MODE_APPROVED = false;

function readEnvFile(): Record<string, string> {
  const candidates = [".env", ".env.local", "../.env", "../../.env"];
  const out: Record<string, string> = {};
  for (const c of candidates) {
    const p = resolve(process.cwd(), c);
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
          const key = m?.[1];
          const val = m?.[2];
          if (key && val !== undefined && !line.trim().startsWith("#") && out[key] === undefined) {
            out[key] = val.trim().replace(/^["']|["']$/g, "");
          }
        }
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

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
  /** Authentication. "development" gives a clearly labeled local session; real OAuth is not connected yet. */
  AUTH_MODE: z.enum(["development", "oauth"]).default("development"),
  /** Guest preview for hosted builds: each visitor gets an anonymous, labeled session until real sign-in exists. */
  GUEST_PREVIEW: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  /** Live fetching of external sources. Providers are pending until approved (DATA_POLICY.md). */
  INGESTION_LIVE_SOURCES: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const fileEnv = readEnvFile();
  const merged = { ...fileEnv, ...source };
  const parsed = schema.safeParse(merged);
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
