import type { SourceInfo } from "@opensourcex/database";

export type StatusKey =
  | "CONFIRMED"
  | "HISTORICAL"
  | "INFERRED"
  | "FORECAST"
  | "UNKNOWN"
  | "STALE"
  | "CONFLICTING"
  | "RECORDED"
  | "DEVELOPMENT"
  | "PLACEHOLDER";

export const STATUS_META: Record<
  StatusKey,
  { glyph: string; cls: string; label: string; hint: string }
> = {
  CONFIRMED: {
    glyph: "✓",
    cls: "c-ok",
    label: "Confirmed",
    hint: "Stated by the source at the time it was recorded.",
  },
  HISTORICAL: {
    glyph: "◷",
    cls: "c-hist",
    label: "Historical",
    hint: "True for a past period; kept as a record.",
  },
  INFERRED: {
    glyph: "≈",
    cls: "c-inf",
    label: "Inferred",
    hint: "Derived by a rule from the source data; the rule is shown.",
  },
  FORECAST: { glyph: "↗", cls: "c-fc", label: "Forecast", hint: "A prediction, never a fact." },
  UNKNOWN: { glyph: "?", cls: "c-unk", label: "Not verified", hint: "No source establishes this." },
  STALE: {
    glyph: "⏱",
    cls: "c-stale",
    label: "Stale",
    hint: "Older than its freshness window; may be outdated.",
  },
  CONFLICTING: {
    glyph: "⇄",
    cls: "c-conf",
    label: "Conflicting",
    hint: "Sources disagree; all values are shown.",
  },
  RECORDED: {
    glyph: "●",
    cls: "c-rec",
    label: "Recorded snapshot",
    hint: "Read from a saved, sanitized snapshot; not fetched live.",
  },
  DEVELOPMENT: {
    glyph: "◇",
    cls: "c-dev",
    label: "Development data",
    hint: "Sample data for the development build.",
  },
  PLACEHOLDER: {
    glyph: "▫",
    cls: "c-dev",
    label: "Placeholder",
    hint: "UI-only placeholder; not real information.",
  },
};

export function asStatus(s: string): StatusKey {
  return (s in STATUS_META ? s : "UNKNOWN") as StatusKey;
}

export const day = (iso: string) => iso.slice(0, 10);

/** The one honest label for where a record comes from. */
export function originLabel(s: SourceInfo): string {
  return s.origin === "recorded" ? "Recorded snapshot" : "Live";
}

export function liveLabel(ingestion: string): string {
  return ingestion === "approved"
    ? "Live approved"
    : ingestion === "blocked"
      ? "Live blocked"
      : "Live not approved";
}
