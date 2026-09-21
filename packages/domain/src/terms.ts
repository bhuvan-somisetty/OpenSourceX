/**
 * LFX / CNCF term normalization (docs/INGESTION_PIPELINE.md section 3).
 * Dates decide; the raw name is only a hint and is always preserved by the caller.
 * Never a string-only mapping: a name that disagrees with the dates yields CONFLICTING.
 */
export type TermCode = "T1" | "T2" | "T3";
export type Track = "full-time" | "part-time";
export type TermStatus = "CONFIRMED" | "INFERRED" | "CONFLICTING" | "UNKNOWN";
export type Confidence = "high" | "medium" | "low" | "none";
export type DerivedTermStatus = "upcoming" | "in_progress" | "completed" | "unknown";

export interface TermInput {
  rawName: string;
  startSec: number | null;
  endSec: number | null;
}

export interface CanonicalTerm {
  year: number | null;
  termCode: TermCode | null;
  track: Track | null;
  startsOn: string | null;
  endsOn: string | null;
  status: TermStatus;
  confidence: Confidence;
  reason: string;
  rawName: string;
}

const isoDay = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);

function codeFromMonth(month1to12: number): TermCode {
  if (month1to12 <= 4) return "T1";
  if (month1to12 <= 7) return "T2";
  return "T3";
}

/** Hints from the raw text. Weak evidence: used only to corroborate or contradict dates. */
export function termHints(raw: string): {
  code: TermCode | null;
  year: number | null;
  track: Track | null;
} {
  const s = raw.toLowerCase();
  let code: TermCode | null = null;
  const num = s.match(/\bterm\s*([123])\b/) ?? s.match(/\b0([123])\s*-\s*[a-z]/);
  if (num?.[1]) code = `T${num[1]}` as TermCode;
  else if (/mar(ch)?\s*-\s*may|\bspring\b|\bq1\b/.test(s)) code = "T1";
  else if (/jun(e)?\s*-\s*aug|\bsummer\b|\bq2\b/.test(s)) code = "T2";
  else if (/sep(t)?\s*-\s*nov|\bfall\b|\bautumn\b|\bq3\b|\bq4\b/.test(s)) code = "T3";
  const y = s.match(/\b(20\d{2})\b/);
  const track: Track | null = /\bpt\b|part[- ]?time/.test(s)
    ? "part-time"
    : /\bft\b|full[- ]?time/.test(s)
      ? "full-time"
      : null;
  return { code, year: y ? Number(y[1]) : null, track };
}

export function normalizeTerm(t: TermInput): CanonicalTerm {
  const hint = termHints(t.rawName);
  const base = { rawName: t.rawName, track: hint.track };

  if (t.startSec == null) {
    if (hint.code == null && hint.year == null) {
      return {
        ...base,
        year: null,
        termCode: null,
        startsOn: null,
        endsOn: null,
        status: "UNKNOWN",
        confidence: "none",
        reason: "no dates and no usable name",
      };
    }
    return {
      ...base,
      year: hint.year,
      termCode: hint.code,
      startsOn: null,
      endsOn: t.endSec != null ? isoDay(t.endSec) : null,
      status: "INFERRED",
      confidence: "low",
      reason: "no start date; derived from name only",
    };
  }

  const start = new Date(t.startSec * 1000);
  const year = start.getUTCFullYear();
  const code = codeFromMonth(start.getUTCMonth() + 1);
  const common = {
    ...base,
    year,
    termCode: code,
    startsOn: isoDay(t.startSec),
    endsOn: t.endSec != null ? isoDay(t.endSec) : null,
  };

  if (hint.code && hint.code !== code) {
    return {
      ...common,
      status: "CONFLICTING",
      confidence: "low",
      reason: `dates imply ${code}, name implies ${hint.code}`,
    };
  }
  if (hint.year && hint.year !== year) {
    return {
      ...common,
      status: "CONFLICTING",
      confidence: "low",
      reason: `dates imply ${year}, name implies ${hint.year}`,
    };
  }
  if (hint.code) {
    return {
      ...common,
      status: "CONFIRMED",
      confidence: "high",
      reason: "start date and name agree",
    };
  }
  return {
    ...common,
    status: "INFERRED",
    confidence: "medium",
    reason: "derived from start date only (name gave no term hint)",
  };
}

/** Status comes from dates only, never from source prose such as a README "Status:" line. */
export function derivedTermStatus(
  term: Pick<CanonicalTerm, "startsOn" | "endsOn">,
  now = new Date(),
): DerivedTermStatus {
  if (!term.startsOn) return "unknown";
  const t = now.toISOString().slice(0, 10);
  if (t < term.startsOn) return "upcoming";
  if (term.endsOn && t > term.endsOn) return "completed";
  return "in_progress";
}
