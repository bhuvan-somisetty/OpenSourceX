/**
 * Provider registry. Mirrors the permission register in docs/DATA_POLICY.md section 2.
 * Nothing is approved for live ingestion yet; recorded, sanitized snapshots only.
 */
export type IngestionStatus = "approved" | "pending" | "blocked";

export interface ProviderInfo {
  key: "gsoc-archive" | "lfx-mentorship-api" | "cncf-mentoring";
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  program: "gsoc" | "lfx-mentorship";
  ecosystem: string | null;
  coverage: "full" | "ecosystem" | "partial";
  baseUrl: string;
  licenceNote: string;
  ingestion: IngestionStatus;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    key: "gsoc-archive",
    name: "Google Summer of Code archive",
    tier: 1,
    program: "gsoc",
    ecosystem: null,
    coverage: "partial",
    baseUrl: "https://summerofcode.withgoogle.com",
    licenceNote:
      "PENDING: GSoC Program Rules and Terms unread; no reuse licence found (docs/SOURCE_PERMISSIONS.md). Organization/year level only.",
    ingestion: "pending",
  },
  {
    key: "lfx-mentorship-api",
    name: "LFX Mentorship API",
    tier: 1,
    program: "lfx-mentorship",
    ecosystem: null,
    coverage: "partial",
    baseUrl: "https://api.mentorship.lfx.linuxfoundation.org",
    licenceNote:
      "BLOCKED: Acceptable Use Policy prohibits data mining and robots; robots.txt disallows crawlers. Needs written permission (docs/SOURCE_PERMISSIONS.md).",
    ingestion: "blocked",
  },
  {
    key: "cncf-mentoring",
    name: "CNCF mentoring repository",
    tier: 2,
    program: "lfx-mentorship",
    ecosystem: "cncf",
    coverage: "ecosystem",
    baseUrl: "https://github.com/cncf/mentoring",
    licenceNote:
      "CONDITIONAL: program materials CC BY 4.0, code Apache-2.0 (CONTRIBUTING.md); owner approval pending. CNCF projects only.",
    ingestion: "pending",
  },
];

export function getProvider(key: string): ProviderInfo {
  const p = PROVIDERS.find((x) => x.key === key);
  if (!p) throw new Error(`Unknown provider ${key}`);
  return p;
}

/** Live data may enter only from approved providers. Recorded snapshots are always allowed. */
export function assertMayPersist(providerKey: string, origin: "recorded" | "live"): void {
  if (origin === "live" && getProvider(providerKey).ingestion !== "approved") {
    throw new Error(
      `Provider ${providerKey} is ${getProvider(providerKey).ingestion}: live ingestion not allowed`,
    );
  }
}
