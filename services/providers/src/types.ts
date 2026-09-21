/**
 * A recorded or live snapshot after sanitization. Only sanitized projections are ever
 * stored or committed; raw bodies of files that can carry contact data are never persisted
 * (docs/DATA_POLICY.md section 3).
 */
export interface SnapshotEnvelope<T = unknown> {
  provider: "gsoc-archive" | "lfx-mentorship-api" | "cncf-mentoring";
  dataset: string;
  url: string;
  fetchedAt: string;
  origin: "recorded" | "live";
  /** e.g. the commit SHA of the source repository at fetch time */
  sourceRef?: string;
  schemaVersion: string;
  body: T;
}

export const SANITIZER_VERSION = "1";

/** Keep an excerpt short so we never mirror third-party documents (DATA_POLICY.md section 4). */
export function stripHtml(input: string): string {
  return input
    .replace(/^\s*<h[1-6][^>]*>\s*description\s*<\/h[1-6]>/i, "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|div|ul|ol|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/<[^>]*$/, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function excerpt(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const t = stripHtml(text).replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}
