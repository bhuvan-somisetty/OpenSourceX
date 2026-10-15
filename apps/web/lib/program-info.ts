/**
 * Program details (stipend, eligibility, timeline, how to apply) from
 * apps/web/data/programs/info/<program>.json. Each file names the official pages it was
 * taken from; text copies of those pages are kept under data/programs/info/sources/, and
 * published per-country stipend tables under data/programs/info/stipends/.
 */

export interface ProgramInfo {
  program: string;
  checked: string;
  status: "open" | "running" | "concluded";
  statusNote?: string;
  summary: string;
  runBy: string;
  stipend: {
    headline: string;
    detail: string;
    currency?: string;
    paidIn?: string;
    yearNote?: string;
    ranges?: { label: string; value: string }[];
    payments?: { label: string; share?: string; when?: string }[];
    method?: string;
    notes?: string[];
    table?: string;
    tableNote?: string;
  } | null;
  facts: { label: string; value: string }[];
  eligibility: string[];
  timelineTitle?: string;
  timeline?: { label: string; date: string }[];
  howToApply?: string[];
  links: { label: string; url: string }[];
  sources: { label: string; url: string; file: string }[];
}

export interface StipendTable {
  source: string;
  retrieved: string;
  currency: string;
  paidIn?: string;
  columns: string[];
  rows: Record<string, string | number>[];
}

const INFO: Record<string, () => Promise<{ default: unknown }>> = {
  gsoc: () => import("@/data/programs/info/gsoc.json"),
  "lfx-mentorship": () => import("@/data/programs/info/lfx-mentorship.json"),
  outreachy: () => import("@/data/programs/info/outreachy.json"),
  "summer-of-bitcoin": () => import("@/data/programs/info/summer-of-bitcoin.json"),
  "european-summer-of-code": () => import("@/data/programs/info/european-summer-of-code.json"),
  igalia: () => import("@/data/programs/info/igalia.json"),
  "processing-foundation": () => import("@/data/programs/info/processing-foundation.json"),
  "mlh-fellowship": () => import("@/data/programs/info/mlh-fellowship.json"),
  ospp: () => import("@/data/programs/info/ospp.json"),
  c4gt: () => import("@/data/programs/info/c4gt.json"),
  "season-of-docs": () => import("@/data/programs/info/season-of-docs.json"),
};

const TABLES: Record<string, () => Promise<{ default: unknown }>> = {
  gsoc: () => import("@/data/programs/info/stipends/gsoc.json"),
  "lfx-mentorship": () => import("@/data/programs/info/stipends/lfx-mentorship.json"),
  "summer-of-bitcoin": () => import("@/data/programs/info/stipends/summer-of-bitcoin.json"),
};

export async function programInfo(slug: string): Promise<ProgramInfo | null> {
  const load = INFO[slug];
  return load ? ((await load()).default as ProgramInfo) : null;
}

export async function stipendTable(key: string | undefined): Promise<StipendTable | null> {
  const load = key ? TABLES[key] : undefined;
  return load ? ((await load()).default as StipendTable) : null;
}

/** "2026-03-31" -> "31 Mar 2026"; anything else is shown as written. */
export function formatInfoDate(s: string) {
  return s.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) =>
    new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
  );
}
