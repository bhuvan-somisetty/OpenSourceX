import type { Db } from "./client";

/**
 * Read model of the CNCF LFX Mentorship history (every term README of github.com/cncf/mentoring).
 * Small enough (about a thousand programs) to load whole; the answer engine works on it in memory.
 */
export interface HistoryTerm {
  key: string;
  year: number;
  termCode: "T1" | "T2" | "T3";
  label: string;
  sourceUrl: string | null;
  startsOn: string | null;
  endsOn: string | null;
  timeline: { activity: string; dates: string }[];
}

export interface HistoryProgram {
  id: string;
  title: string;
  cncfProject: string;
  /** keys of HistoryTerm, e.g. "2025-T3"; "2019" for the pre-term pilot year */
  terms: string[];
  skills: string[];
  summary: string | null;
  upstreamUrl: string | null;
  lfxUrl: string | null;
  mentors: { name: string; github: string }[];
}

export interface LfxHistory {
  terms: HistoryTerm[];
  programs: HistoryProgram[];
  /** where the data came from, for citations */
  source: { publisher: string; url: string; fetchedAt: string | null };
}

export async function loadLfxHistory(db: Db): Promise<LfxHistory> {
  const terms = (
    await db.query(`
      SELECT pt.year, pt.term_code, d.label, d.source_url, d.timeline,
             to_char(COALESCE(d.starts_on, pt.starts_on), 'YYYY-MM-DD') AS starts_on,
             to_char(COALESCE(d.ends_on, pt.ends_on), 'YYYY-MM-DD') AS ends_on
      FROM program_term pt JOIN program p ON p.id = pt.program_id
      JOIN program_term_detail d ON d.program_term_id = pt.id
      WHERE p.slug = 'lfx-mentorship' ORDER BY pt.year, pt.term_code`)
  ).rows.map((r): HistoryTerm => ({
    key: `${r.year}-${r.term_code}`,
    year: Number(r.year),
    termCode: r.term_code,
    label: r.label,
    sourceUrl: r.source_url,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    timeline: r.timeline ?? [],
  }));
  const rows = (
    await db.query(`
      SELECT m.id, m.title, m.cncf_project_name, m.technologies, m.summary, m.upstream_key, m.raw_repo_link,
             m.lfx_project_uuid,
             COALESCE(array_agg(DISTINCT CASE WHEN pt.id IS NOT NULL THEN pt.year || '-' || pt.term_code
                                              ELSE t.raw_term_name END) FILTER (WHERE t.id IS NOT NULL), '{}') AS terms
      FROM mentorship_project m
      LEFT JOIN mentorship_project_term t ON t.mentorship_project_id = m.id
      LEFT JOIN program_term pt ON pt.id = t.program_term_id
      WHERE m.cncf_project_name IS NOT NULL
      GROUP BY m.id ORDER BY m.id`)
  ).rows;
  const mentors = (
    await db.query(`
      SELECT r.mentorship_project_id AS id, p.display_name AS name, p.github_login AS github
      FROM person_role r JOIN person p ON p.id = r.person_id
      WHERE r.role = 'official_mentor' ORDER BY p.display_name`)
  ).rows;
  const byProgram = new Map<number, { name: string; github: string }[]>();
  for (const m of mentors) {
    const k = Number(m.id);
    byProgram.set(k, [...(byProgram.get(k) ?? []), { name: m.name, github: m.github }]);
  }
  const src = (
    await db.query(`
      SELECT s.url, s.fetched_at FROM source_snapshot s JOIN source_dataset d ON d.id = s.dataset_id
      WHERE d.key = 'cncf-lfx-history' ORDER BY s.fetched_at DESC LIMIT 1`)
  ).rows[0];
  return {
    terms,
    programs: rows.map((r) => ({
      id: `mp-${r.id}`,
      title: r.title,
      cncfProject: r.cncf_project_name,
      terms: [...r.terms].sort(),
      skills: r.technologies ?? [],
      summary: r.summary,
      upstreamUrl: r.raw_repo_link ?? null,
      lfxUrl: r.lfx_project_uuid
        ? `https://mentorship.lfx.linuxfoundation.org/project/${r.lfx_project_uuid}`
        : null,
      mentors: byProgram.get(Number(r.id)) ?? [],
    })),
    source: {
      publisher: "CNCF mentoring repository (CC BY 4.0)",
      url: src?.url ?? "https://github.com/cncf/mentoring/tree/main/programs/lfx-mentorship",
      fetchedAt: src ? new Date(src.fetched_at).toISOString() : null,
    },
  };
}
