import type { Db } from "./client";
import { type SourceInfo } from "./queries";

export interface LfxOrgFilters {
  q?: string;
  tech?: string;
  year?: number;
  term?: string;
}

export interface LfxOrgSummary {
  name: string;
  slug: string;
  description: string | null;
  projectCount: number;
  yearCount: number;
  years: number[];
  terms: string[];
  latestTerm: string;
  technologies: string[];
  sampleRepoUrl: string | null;
  sources: SourceInfo[];
}

export interface LfxOrgProject {
  id: string; // e.g. "mp-123"
  rawId: number;
  title: string;
  orgName: string;
  orgSlug: string;
  year: number | null;
  termCode: string | null;
  termBadge: string;
  track: string;
  technologies: string[];
  summary: string | null;
  upstreamKey: string | null;
  rawRepoLink: string | null;
  lfxUrl: string | null;
  mentors: Array<{ name: string; github: string | null }>;
  source: SourceInfo | null;
}

export interface LfxOrgTermGroup {
  termCode: string; // e.g. "T3", "T2", "T1"
  termLabel: string; // e.g. "Term 3"
  termBadge: string; // e.g. "2026 T3"
  startsOn: string | null;
  endsOn: string | null;
  projects: LfxOrgProject[];
}

export interface LfxOrgYearGroup {
  year: number;
  terms: LfxOrgTermGroup[];
}

export interface LfxOrgDetail {
  name: string;
  slug: string;
  description: string | null;
  projectCount: number;
  yearCount: number;
  years: number[];
  latestTerm: string;
  technologies: string[];
  sampleRepoUrl: string | null;
  sources: SourceInfo[];
  timeline: LfxOrgYearGroup[];
  allProjects: LfxOrgProject[];
}

const SOURCE_SQL = `
  SELECT pr.id AS "provenanceId", d.key AS dataset, p.key AS provider, p.name AS "providerName",
         pr.publisher, p.tier, p.ingestion_status AS ingestion, s.origin, pr.source_url AS url,
         s.fetched_at AS "fetchedAt", pr.status, pr.confidence, pr.confidence_reason AS "confidenceReason", pr.derivation, pr.rule_id AS "ruleId",
         COALESCE(pf.freshness, 'unknown') AS freshness
  FROM provenance_record pr
  JOIN source_snapshot s ON s.id = pr.snapshot_id
  JOIN source_dataset d ON d.id = s.dataset_id
  JOIN source_provider p ON p.id = d.provider_id
  LEFT JOIN provenance_freshness pf ON pf.provenance_id = pr.id
  WHERE pr.id = ANY($1::bigint[])`;

async function fetchSources(db: Db, ids: number[]): Promise<Map<number, SourceInfo>> {
  const uniq = [...new Set(ids.filter((n) => n != null && !isNaN(n)))];
  if (!uniq.length) return new Map();
  const { rows } = await db.query(SOURCE_SQL, [uniq]);
  return new Map(
    rows.map((r) => [
      Number(r.provenanceId),
      {
        ...r,
        provenanceId: Number(r.provenanceId),
        tier: Number(r.tier),
        fetchedAt: new Date(r.fetchedAt).toISOString(),
      } as SourceInfo,
    ]),
  );
}

const termSortWeight = (code: string | null): number => {
  if (!code) return 0;
  const upper = code.toUpperCase();
  if (upper === "T3") return 3;
  if (upper === "T2") return 2;
  if (upper === "T1") return 1;
  return 0;
};

export async function listLfxOrganizations(
  db: Db,
  filters: LfxOrgFilters = {},
): Promise<{
  organizations: LfxOrgSummary[];
  total: number;
  facets: {
    years: number[];
    terms: string[];
    technologies: { value: string; n: number }[];
  };
}> {
  // 1. Fetch all LFX mentorship project records and their terms
  const mpRows = (
    await db.query(`
      SELECT 
        m.id, m.title, m.cncf_project_name, m.cncf_project_slug, m.technologies, m.summary,
        m.upstream_key, m.raw_repo_link, m.lfx_project_uuid, m.provenance_id,
        pt.year, pt.term_code, pt.track, t.raw_term_name
      FROM mentorship_project m
      JOIN program p ON p.id = m.program_id
      LEFT JOIN mentorship_project_term t ON t.mentorship_project_id = m.id
      LEFT JOIN program_term pt ON pt.id = t.program_term_id
      WHERE p.slug = 'lfx-mentorship' AND m.cncf_project_name IS NOT NULL
      ORDER BY m.cncf_project_name ASC, COALESCE(pt.year, 0) DESC, COALESCE(pt.term_code, '') DESC
    `)
  ).rows;

  const provIds: number[] = [];
  for (const r of mpRows) {
    if (r.provenance_id) provIds.push(Number(r.provenance_id));
  }
  const srcMap = await fetchSources(db, provIds);

  // Group by canonical organization (slug or name)
  const orgMap = new Map<
    string,
    {
      name: string;
      slug: string;
      projectIds: Set<number>;
      years: Set<number>;
      terms: Set<string>;
      techMap: Map<string, number>;
      summaries: string[];
      repoUrls: string[];
      sources: Set<SourceInfo>;
    }
  >();

  const allYearsSet = new Set<number>();
  const allTermsSet = new Set<string>();
  const globalTechMap = new Map<string, { value: string; n: number }>();

  for (const r of mpRows) {
    const name = r.cncf_project_name as string;
    const slug = (
      r.cncf_project_slug ??
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    ) as string;

    if (!orgMap.has(slug)) {
      orgMap.set(slug, {
        name,
        slug,
        projectIds: new Set(),
        years: new Set(),
        terms: new Set(),
        techMap: new Map(),
        summaries: [],
        repoUrls: [],
        sources: new Set(),
      });
    }

    const org = orgMap.get(slug)!;
    org.projectIds.add(Number(r.id));

    if (r.year) {
      const y = Number(r.year);
      org.years.add(y);
      allYearsSet.add(y);
    }

    if (r.year && r.term_code) {
      const tKey = `${r.year}-${r.term_code}`;
      org.terms.add(tKey);
      allTermsSet.add(r.term_code as string);
    } else if (r.raw_term_name) {
      org.terms.add(r.raw_term_name as string);
    }

    if (Array.isArray(r.technologies)) {
      for (const rawTech of r.technologies) {
        if (!rawTech || typeof rawTech !== "string") continue;
        const trimmed = rawTech.trim();
        if (!trimmed) continue;
        const low = trimmed.toLowerCase();
        
        // Org tech count
        org.techMap.set(low, (org.techMap.get(low) ?? 0) + 1);

        // Global facet
        const cur = globalTechMap.get(low);
        if (!cur) {
          globalTechMap.set(low, { value: trimmed, n: 1 });
        } else {
          cur.n += 1;
          if (cur.value === cur.value.toLowerCase() && trimmed !== trimmed.toLowerCase()) {
            cur.value = trimmed;
          }
        }
      }
    }

    if (r.summary && typeof r.summary === "string" && r.summary.trim()) {
      org.summaries.push(r.summary.trim());
    }
    if (r.upstream_key && typeof r.upstream_key === "string" && r.upstream_key.trim()) {
      org.repoUrls.push(r.upstream_key.trim());
    }
    if (r.provenance_id && srcMap.has(Number(r.provenance_id))) {
      org.sources.add(srcMap.get(Number(r.provenance_id))!);
    }
  }

  // Convert orgMap to array of summaries
  let orgList: LfxOrgSummary[] = [...orgMap.values()].map((o) => {
    const sortedYears = [...o.years].sort((a, b) => b - a);
    const sortedTerms = [...o.terms].sort((a, b) => b.localeCompare(a));
    
    let latestTerm = "";
    if (sortedYears.length > 0) {
      const topYear = sortedYears[0];
      const yearTerms = sortedTerms
        .filter((t) => t.startsWith(`${topYear}-`))
        .map((t) => t.replace(`${topYear}-`, ""))
        .sort((a, b) => termSortWeight(b) - termSortWeight(a));
      if (yearTerms.length > 0) {
        latestTerm = `${topYear} ${yearTerms[0]}`;
      } else {
        latestTerm = `${topYear}`;
      }
    }

    // Sort technologies by frequency
    const sortedTech = [...o.techMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => globalTechMap.get(t)?.value ?? t);

    return {
      name: o.name,
      slug: o.slug,
      description: o.summaries[0] ? (o.summaries[0].length > 120 ? `${o.summaries[0].slice(0, 117)}...` : o.summaries[0]) : null,
      projectCount: o.projectIds.size,
      yearCount: o.years.size,
      years: sortedYears,
      terms: sortedTerms,
      latestTerm,
      technologies: sortedTech,
      sampleRepoUrl: o.repoUrls[0] ?? null,
      sources: [...o.sources],
    };
  });

  const total = orgList.length;

  // Apply filters
  const q = filters.q?.trim().toLowerCase();
  const techFilter = filters.tech?.trim().toLowerCase();
  const yearFilter = filters.year ? Number(filters.year) : undefined;
  const termFilter = filters.term?.trim().toUpperCase();

  if (q || techFilter || yearFilter || termFilter) {
    orgList = orgList.filter((o) => {
      if (yearFilter && !o.years.includes(yearFilter)) return false;
      if (termFilter && !o.terms.some((t) => t.includes(termFilter))) return false;
      if (techFilter && !o.technologies.some((t) => t.toLowerCase() === techFilter)) return false;
      if (q) {
        const matchName = o.name.toLowerCase().includes(q);
        const matchDesc = o.description ? o.description.toLowerCase().includes(q) : false;
        const matchTech = o.technologies.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchTech) return false;
      }
      return true;
    });
  }

  // Sort: projects count desc, then name asc
  orgList.sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));

  const sortedGlobalTech = [...globalTechMap.values()].sort((a, b) => b.n - a.n || a.value.localeCompare(b.value));

  return {
    organizations: orgList,
    total,
    facets: {
      years: [...allYearsSet].sort((a, b) => b - a),
      terms: ["T3", "T2", "T1"],
      technologies: sortedGlobalTech,
    },
  };
}

export async function getLfxOrganization(
  db: Db,
  slugOrName: string,
): Promise<LfxOrgDetail | null> {
  const cleanTarget = slugOrName.trim().toLowerCase();

  // Fetch mentorship projects for this org
  const mpRows = (
    await db.query(
      `
      SELECT 
        m.id, m.title, m.cncf_project_name, m.cncf_project_slug, m.technologies, m.summary,
        m.upstream_key, m.raw_repo_link, m.lfx_project_uuid, m.provenance_id,
        pt.year, pt.term_code, pt.track, pt.starts_on, pt.ends_on, t.raw_term_name,
        d.starts_on AS d_starts_on, d.ends_on AS d_ends_on
      FROM mentorship_project m
      JOIN program p ON p.id = m.program_id
      LEFT JOIN mentorship_project_term t ON t.mentorship_project_id = m.id
      LEFT JOIN program_term pt ON pt.id = t.program_term_id
      LEFT JOIN program_term_detail d ON d.program_term_id = pt.id
      WHERE p.slug = 'lfx-mentorship'
        AND (
          lower(m.cncf_project_slug) = $1 
          OR lower(m.cncf_project_name) = $1 
          OR lower(regexp_replace(m.cncf_project_name, '[^a-zA-Z0-9]+', '-', 'g')) = $1
        )
      ORDER BY COALESCE(pt.year, 0) DESC, COALESCE(pt.term_code, '') DESC, m.id ASC
    `,
      [cleanTarget],
    )
  ).rows;

  if (!mpRows.length) return null;

  const orgName = mpRows[0].cncf_project_name as string;
  const orgSlug = (
    mpRows[0].cncf_project_slug ??
    orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  ) as string;

  // Fetch mentors for all these projects
  const mpIds = mpRows.map((r) => Number(r.id));
  const mentorsRows = (
    await db.query(
      `
      SELECT r.mentorship_project_id AS id, p.display_name AS name, p.github_login AS github
      FROM person_role r JOIN person p ON p.id = r.person_id
      WHERE r.mentorship_project_id = ANY($1::bigint[]) AND r.role = 'official_mentor'
      ORDER BY p.display_name
    `,
      [mpIds],
    )
  ).rows;

  const mentorMap = new Map<number, Array<{ name: string; github: string | null }>>();
  for (const m of mentorsRows) {
    const k = Number(m.id);
    mentorMap.set(k, [
      ...(mentorMap.get(k) ?? []),
      { name: m.name as string, github: (m.github as string) || null },
    ]);
  }

  // Fetch sources
  const provIds = mpRows.map((r) => Number(r.provenance_id)).filter(Boolean);
  const srcMap = await fetchSources(db, provIds);

  const allProjectsMap = new Map<number, LfxOrgProject>();
  const yearGroupsMap = new Map<number, Map<string, {
    termCode: string;
    termLabel: string;
    termBadge: string;
    startsOn: string | null;
    endsOn: string | null;
    projects: LfxOrgProject[];
  }>>();

  const techFreq = new Map<string, { value: string; n: number }>();
  const repoUrls = new Set<string>();
  const summaries: string[] = [];
  const sourcesSet = new Set<SourceInfo>();

  for (const r of mpRows) {
    const rawId = Number(r.id);
    const yr = r.year ? Number(r.year) : null;
    const termCode = (r.term_code as string) || (r.raw_term_name as string) || null;
    const termBadge = yr && termCode ? `${yr} ${termCode}` : termCode ?? (yr ? `${yr}` : "Recorded");
    const termLabel = termCode ? (termCode.startsWith("T") ? `Term ${termCode.slice(1)}` : termCode) : "Recorded Term";

    const techList: string[] = [];
    if (Array.isArray(r.technologies)) {
      for (const t of r.technologies) {
        if (!t || typeof t !== "string") continue;
        const trimmed = t.trim();
        if (!trimmed) continue;
        techList.push(trimmed);
        const low = trimmed.toLowerCase();
        const cur = techFreq.get(low);
        if (!cur) techFreq.set(low, { value: trimmed, n: 1 });
        else {
          cur.n += 1;
          if (cur.value === cur.value.toLowerCase() && trimmed !== trimmed.toLowerCase()) {
            cur.value = trimmed;
          }
        }
      }
    }

    if (r.upstream_key) repoUrls.add(r.upstream_key as string);
    if (r.summary) summaries.push(r.summary as string);

    const source = r.provenance_id ? (srcMap.get(Number(r.provenance_id)) ?? null) : null;
    if (source) sourcesSet.add(source);

    const project: LfxOrgProject = {
      id: `mp-${rawId}`,
      rawId,
      title: r.title as string,
      orgName,
      orgSlug,
      year: yr,
      termCode,
      termBadge,
      track: (r.track as string) || "unspecified",
      technologies: techList,
      summary: (r.summary as string) || null,
      upstreamKey: (r.upstream_key as string) || null,
      rawRepoLink: (r.raw_repo_link as string) || null,
      lfxUrl: r.lfx_project_uuid
        ? `https://mentorship.lfx.linuxfoundation.org/project/${r.lfx_project_uuid}`
        : null,
      mentors: mentorMap.get(rawId) ?? [],
      source,
    };

    allProjectsMap.set(rawId, project);

    // Grouping into Year -> Term
    const groupYear = yr ?? 0;
    if (!yearGroupsMap.has(groupYear)) {
      yearGroupsMap.set(groupYear, new Map());
    }
    const termMap = yearGroupsMap.get(groupYear)!;
    const groupTermCode = termCode || "General";
    if (!termMap.has(groupTermCode)) {
      const starts = r.d_starts_on || r.starts_on ? new Date(r.d_starts_on || r.starts_on).toISOString().slice(0, 10) : null;
      const ends = r.d_ends_on || r.ends_on ? new Date(r.d_ends_on || r.ends_on).toISOString().slice(0, 10) : null;
      termMap.set(groupTermCode, {
        termCode: groupTermCode,
        termLabel,
        termBadge,
        startsOn: starts,
        endsOn: ends,
        projects: [],
      });
    }
    termMap.get(groupTermCode)!.projects.push(project);
  }

  // Sort Years DESC
  const sortedYears = [...yearGroupsMap.keys()].filter((y) => y > 0).sort((a, b) => b - a);
  // Include year 0 (unmapped) at the end if present
  if (yearGroupsMap.has(0)) sortedYears.push(0);

  const timeline: LfxOrgYearGroup[] = sortedYears.map((year) => {
    const termMap = yearGroupsMap.get(year)!;
    const sortedTerms = [...termMap.values()].sort((a, b) => {
      const wa = termSortWeight(a.termCode);
      const wb = termSortWeight(b.termCode);
      if (wa !== wb) return wb - wa;
      return b.termCode.localeCompare(a.termCode);
    });
    return {
      year,
      terms: sortedTerms,
    };
  });

  const distinctYears = sortedYears.filter((y) => y > 0);
  let latestTerm = "";
  if (timeline.length > 0 && timeline[0]?.terms && timeline[0].terms.length > 0 && timeline[0].terms[0]) {
    latestTerm = timeline[0].terms[0].termBadge;
  }

  const sortedTech = [...techFreq.values()]
    .sort((a, b) => b.n - a.n || a.value.localeCompare(b.value))
    .slice(0, 15)
    .map((t) => t.value);

  return {
    name: orgName,
    slug: orgSlug,
    description: summaries[0] ? (summaries[0].length > 150 ? `${summaries[0].slice(0, 147)}...` : summaries[0]) : null,
    projectCount: allProjectsMap.size,
    yearCount: distinctYears.length,
    years: distinctYears,
    latestTerm,
    technologies: sortedTech,
    sampleRepoUrl: [...repoUrls][0] ?? null,
    sources: [...sourcesSet],
    timeline,
    allProjects: [...allProjectsMap.values()],
  };
}
