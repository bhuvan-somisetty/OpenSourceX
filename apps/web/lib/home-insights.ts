import { knowledge } from "@/lib/assistant/engine";
import { parseOrgEntityId } from "@/lib/org-ids";
import { programInfo } from "@/lib/program-info";
import { PROGRAM_CATALOG, type ProgramDef } from "@/lib/programs";

/** What to do next with the organization the user saved most recently. Only recorded links. */
export interface NextStep {
  name: string;
  programShort: string;
  href: string;
  chat: { label: string; url: string } | null;
  issuesUrl: string | null;
  askQuery: string;
  program: string;
  description: string | null;
  logo: string | null;
  logoOnDark: boolean;
  /** LFX logo set key, when the organization has no program logo file */
  lfxSlug: string | null;
  tags: string[];
  /** years (or LFX terms) the organization took part, oldest first */
  years: number[];
  terms: number;
  projectCount: number;
  repoUrl: string | null;
}

/** GitHub "good first issue" list for a repository, or a search across a GitHub organization. */
export function firstIssuesUrl(url: string | null): string | null {
  const m = url
    ? /^https:\/\/github\.com\/([\w.-]+)(?:\/([\w.-]+))?\/?(?:[#?].*)?$/.exec(url)
    : null;
  if (!m) return null;
  const label = encodeURIComponent('label:"good first issue"');
  return m[2]
    ? `https://github.com/${m[1]}/${m[2]}/issues?q=is%3Aopen+is%3Aissue+${label}`
    : `https://github.com/search?q=org%3A${m[1]}+is%3Aopen+is%3Aissue+${label}&type=issues`;
}

export async function nextStep(savedEntityIds: string[]): Promise<NextStep | null> {
  const k = await knowledge().catch(() => null);
  if (!k) return null;
  for (const id of savedEntityIds) {
    const ref = parseOrgEntityId(id);
    if (!ref) continue;
    for (const o of k.orgs) {
      const e = o.programs.find((p) => p.program === ref.program && p.orgSlug === ref.orgSlug);
      if (!e) continue;
      const def = PROGRAM_CATALOG.find((d) => d.slug === ref.program);
      const c = o.chats[0];
      return {
        name: o.name,
        programShort: def?.short ?? e.programName,
        href: e.pageUrl,
        chat: c
          ? {
              label: `Join ${c.workspace}${c.channels?.[0] ? ` ${c.channels[0]}` : ""}`,
              url: c.channelUrl ?? c.joinUrl,
            }
          : null,
        issuesUrl: firstIssuesUrl(o.repoUrl ?? o.githubUrl),
        askQuery: `How do I start contributing to ${o.name}?`,
        program: ref.program,
        description: o.description,
        logo: o.logo ?? null,
        logoOnDark: o.logoOnDark ?? false,
        lfxSlug: ref.program === "lfx-mentorship" ? ref.orgSlug : null,
        tags: [...new Set(o.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 6),
        years: [...new Set(e.years)].sort((a, b) => a - b),
        terms: e.terms?.length ?? 0,
        projectCount: e.projectCount,
        repoUrl: o.repoUrl ?? o.githubUrl,
      };
    }
  }
  return null;
}

/** An upcoming dated milestone from a program's official timeline. */
export interface Deadline {
  program: ProgramDef;
  label: string;
  date: string;
  days: number;
}

const ISO = /^(\d{4}-\d{2}-\d{2})(?:\s+to\s+.*)?$/;
const DAY = 86_400_000;

/**
 * The next dated milestones across every program, soonest first. Only timeline entries with an
 * exact date (YYYY-MM-DD) count; approximate ones ("Mid-May", "Week of …") are left out.
 */
export async function upcomingDeadlines(now = new Date(), limit = 4): Promise<Deadline[]> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: Deadline[] = [];
  for (const def of PROGRAM_CATALOG) {
    const info = await programInfo(def.slug).catch(() => null);
    for (const t of info?.timeline ?? []) {
      const m = ISO.exec(t.date.trim());
      if (!m) continue;
      const [y, mo, d] = m[1]!.split("-").map(Number);
      const days = Math.round((Date.UTC(y!, mo! - 1, d!) - today) / DAY);
      if (days >= 0) out.push({ program: def, label: t.label, date: m[1]!, days });
    }
  }
  return out.sort((a, b) => a.days - b.days).slice(0, limit);
}

/** Oldest "checked" date among the program files, for the source note. */
export async function deadlinesChecked(): Promise<string | null> {
  const dates: string[] = [];
  for (const def of PROGRAM_CATALOG) {
    const info = await programInfo(def.slug).catch(() => null);
    if (info?.checked) dates.push(info.checked);
  }
  return dates.sort()[0] ?? null;
}
