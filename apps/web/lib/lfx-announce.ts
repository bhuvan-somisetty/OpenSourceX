import { lfxBusiestProjects, loadLfxTerms, type HistoryTerm } from "@opensourcex/database";
import { load } from "@/lib/data";
import { termToAnnounce } from "@/lib/lfx-timeline";

export interface LfxAnnouncement {
  term: HistoryTerm;
  /** CNCF projects with the most LFX projects in the last five terms */
  busiest: { name: string; slug: string | null; projects: number; terms: string[] }[];
}

/** The LFX term to announce today (from the official cncf/mentoring timeline), or null. */
export async function lfxAnnouncement(): Promise<LfxAnnouncement | null> {
  const res = await load(async (d) => {
    const term = termToAnnounce(await loadLfxTerms(d), new Date().toISOString().slice(0, 10));
    return term ? { term, busiest: await lfxBusiestProjects(d, 5, 8) } : null;
  });
  return res.ok ? res.data : null;
}
