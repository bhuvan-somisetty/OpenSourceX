import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProvider, type ProviderInfo } from "./registry";
import type { SnapshotEnvelope } from "./types";

/**
 * Provider contract (docs/INGESTION_PIPELINE.md section 4). A provider turns a source into
 * sanitized envelopes. Live access is gated: no live network code exists yet, and the guard
 * below refuses it unless the provider is `approved` AND live sources are switched on.
 * New LFX ecosystems are added as new providers implementing this interface.
 */
export class LiveAccessDisabledError extends Error {
  constructor(provider: string, reason: string) {
    super(`Live access to ${provider} is disabled: ${reason}`);
    this.name = "LiveAccessDisabledError";
  }
}

export interface LiveContext {
  liveSourcesEnabled: boolean;
}

export interface SourceProvider {
  info: ProviderInfo;
  datasets: readonly string[];
  /** Sanitized recorded snapshots. Always allowed; never touches the network. */
  fetchRecorded(): Promise<SnapshotEnvelope[]>;
  /** Live fetch. Guarded; the network implementation is intentionally not written yet. */
  fetchLive(ctx: LiveContext): Promise<SnapshotEnvelope[]>;
}

export function assertLiveAllowed(providerKey: string, ctx: LiveContext): void {
  const p = getProvider(providerKey);
  if (p.ingestion !== "approved")
    throw new LiveAccessDisabledError(providerKey, `ingestion status is ${p.ingestion}`);
  if (!ctx.liveSourcesEnabled)
    throw new LiveAccessDisabledError(providerKey, "INGESTION_LIVE_SOURCES is false");
}

/** Recorded, sanitized snapshots live in the repo-level fixtures/ folder, one subfolder per source. */
export const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "fixtures",
);
export function fixtureFile(name: string): string {
  const sub = name.startsWith("gsoc") ? "gsoc" : name.startsWith("lfx") ? "lfx" : "cncf";
  return path.join(FIXTURES_DIR, sub, name);
}

/** Provider backed by recorded, sanitized fixture files. */
export function recordedProvider(
  key: ProviderInfo["key"],
  datasets: readonly string[],
  files: readonly string[],
): SourceProvider {
  const info = getProvider(key);
  return {
    info,
    datasets,
    async fetchRecorded() {
      return Promise.all(
        files.map(
          async (f) => JSON.parse(await readFile(fixtureFile(f), "utf8")) as SnapshotEnvelope,
        ),
      );
    },
    async fetchLive(ctx) {
      assertLiveAllowed(key, ctx);
      throw new Error("Live fetching is not implemented: blocked on Q2/Q18 (docs/DATA_POLICY.md)");
    },
  };
}

export const gsocProvider = () =>
  recordedProvider("gsoc-archive", ["gsoc-orgs"], ["gsoc-2025-orgs-sample.json"]);
export const lfxProvider = () =>
  recordedProvider("lfx-mentorship-api", ["lfx-projects"], ["lfx-projects-sample.json"]);
/** CNCF ecosystem inside LFX Mentorship. Covers CNCF projects only, never all of LFX. */
export const cncfProvider = () =>
  recordedProvider("cncf-mentoring", ["cncf-lfx-export"], ["cncf-lfx-export-2026-t3.json"]);
export const allProviders = () => [gsocProvider(), lfxProvider(), cncfProvider()];
