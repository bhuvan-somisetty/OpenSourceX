import type { Db } from "./client";

/**
 * Read-only data-access layer. Web pages and Route Handlers call these functions;
 * SQL never appears in UI code. Results are plain JSON-safe objects.
 */
export type Freshness = "fresh" | "stale" | "unknown";

export interface SourceInfo {
  provenanceId: number;
  dataset: string;
  provider: string;
  providerName: string;
  publisher: string;
  tier: number;
  ingestion: string;
  origin: "recorded" | "live";
  url: string;
  fetchedAt: string;
  status: string;
  confidence: string;
  confidenceReason: string;
  derivation: string;
  ruleId: string | null;
  freshness: Freshness;
}

export interface ProjectCard {
  id: string;
  kind: "mentorship" | "organization";
  name: string;
  org: string | null;
  program: { slug: string; name: string };
  ecosystem: string | null;
  terms: string[];
  technologies: string[];
  topics: string[];
  repoUrl: string | null;
  repoState: string;
  summary: string | null;
  source: SourceInfo;
}

export interface ProgramSummary {
  slug: string;
  name: string;
  officialUrl: string;
  granularity: "organization_year" | "project_term";
  years: number[];
  organizations: number;
  mentorshipProjects: number;
  terms: number;
  ecosystems: { key: string; name: string; note: string }[];
  sources: SourceInfo[];
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

async function sources(db: Db, ids: number[]): Promise<Map<number, SourceInfo>> {
  const uniq = [...new Set(ids.filter((n) => n != null))];
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

const termLabel = (year: number, code: string, track: string) =>
  `${year} ${code}${track === "unspecified" ? "" : ` ${track}`}`;

async function allCards(db: Db): Promise<ProjectCard[]> {
  const mp = (
    await db.query(`
      SELECT m.id, m.title, m.raw_repo_link, m.upstream_key, m.link_state, m.summary, m.technologies, m.cncf_project_slug,
             m.provenance_id, e.name AS ecosystem, pg.slug AS pslug, pg.name AS pname
      FROM mentorship_project m JOIN program pg ON pg.id = m.program_id
      LEFT JOIN program_ecosystem e ON e.id = m.ecosystem_id ORDER BY m.title`)
  ).rows;
  const mterms = (
    await db.query(`
      SELECT t.mentorship_project_id AS id, pt.year, pt.term_code, pt.track, t.raw_term_name
      FROM mentorship_project_term t LEFT JOIN program_term pt ON pt.id = t.program_term_id ORDER BY pt.year, pt.term_code`)
  ).rows;
  const orgs = (
    await db.query(`
      SELECT o.id, o.name, o.website_url, o.source_code_url, o.tagline, o.provenance_id, py.year, pg.slug AS pslug, pg.name AS pname
      FROM organization o JOIN participation pa ON pa.organization_id = o.id
      JOIN program_year py ON py.id = pa.program_year_id JOIN program pg ON pg.id = py.program_id ORDER BY o.name, py.year`)
  ).rows;
  const tags = (
    await db.query("SELECT organization_id AS id, kind, value FROM organization_tag ORDER BY value")
  ).rows;
  const src = await sources(
    db,
    [...mp.map((r) => r.provenance_id), ...orgs.map((r) => r.provenance_id)].map(Number),
  );

  const cards: ProjectCard[] = mp.map((m) => ({
    id: `mp-${m.id}`,
    kind: "mentorship",
    name: m.title,
    org: m.cncf_project_slug ? m.cncf_project_slug : null,
    program: { slug: m.pslug, name: m.pname },
    ecosystem: m.ecosystem,
    terms: mterms
      .filter((t) => Number(t.id) === Number(m.id))
      .map((t) =>
        t.year ? termLabel(t.year, t.term_code, t.track) : `unmapped: ${t.raw_term_name}`,
      ),
    technologies: m.technologies ?? [],
    topics: [],
    repoUrl: m.upstream_key,
    repoState: m.link_state,
    summary: m.summary,
    source: src.get(Number(m.provenance_id))!,
  }));
  const byOrg = new Map<number, (typeof orgs)[number][]>();
  for (const o of orgs) byOrg.set(Number(o.id), [...(byOrg.get(Number(o.id)) ?? []), o]);
  for (const [id, rows] of byOrg) {
    const o = rows[0]!;
    const t = tags.filter((x) => Number(x.id) === id);
    cards.push({
      id: `org-${id}`,
      kind: "organization",
      name: o.name,
      org: null,
      program: { slug: o.pslug, name: o.pname },
      ecosystem: null,
      terms: rows.map((r) => `${r.year}`),
      technologies: t.filter((x) => x.kind === "tech").map((x) => x.value),
      topics: t.filter((x) => x.kind !== "tech").map((x) => x.value),
      repoUrl: o.source_code_url,
      repoState: o.source_code_url ? "recorded" : "none",
      summary: o.tagline,
      source: src.get(Number(o.provenance_id))!,
    });
  }
  return cards;
}

export interface ProjectFilters {
  q?: string;
  program?: string;
  tech?: string;
  topic?: string;
}

export async function listProjects(db: Db, f: ProjectFilters = {}) {
  const all = await allCards(db);
  const q = f.q?.trim().toLowerCase();
  const items = all.filter(
    (c) =>
      (!f.program || c.program.slug === f.program) &&
      (!f.tech || c.technologies.some((t) => t.toLowerCase() === f.tech!.toLowerCase())) &&
      (!f.topic || c.topics.some((t) => t.toLowerCase() === f.topic!.toLowerCase())) &&
      (!q ||
        [c.name, c.org ?? "", c.summary ?? "", ...c.technologies, ...c.topics]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  // Group case-insensitively (sources differ: "typescript" vs "TypeScript"); show the capitalized spelling if any.
  const count = (xs: string[]) => {
    const m = new Map<string, { value: string; n: number }>();
    for (const x of xs) {
      const k = x.toLowerCase();
      const cur = m.get(k);
      if (!cur) m.set(k, { value: x, n: 1 });
      else {
        cur.n += 1;
        if (cur.value === cur.value.toLowerCase() && x !== x.toLowerCase()) cur.value = x;
      }
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.value.localeCompare(b.value));
  };
  return {
    items,
    total: all.length,
    facets: {
      programs: [...new Map(all.map((c) => [c.program.slug, c.program.name])).entries()].map(
        ([slug, name]) => ({ slug, name }),
      ),
      technologies: count(all.flatMap((c) => c.technologies)),
      topics: count(all.flatMap((c) => c.topics)),
    },
  };
}

export async function listPrograms(db: Db): Promise<ProgramSummary[]> {
  const progs = (await db.query("SELECT id, slug, name, official_url FROM program ORDER BY name"))
    .rows;
  const out: ProgramSummary[] = [];
  for (const p of progs) {
    const years = (
      await db.query("SELECT year FROM program_year WHERE program_id=$1 ORDER BY year", [p.id])
    ).rows.map((r) => r.year as number);
    const orgs = Number(
      (
        await db.query(
          "SELECT count(DISTINCT pa.organization_id) FROM participation pa JOIN program_year py ON py.id=pa.program_year_id WHERE py.program_id=$1",
          [p.id],
        )
      ).rows[0].count,
    );
    const mps = Number(
      (await db.query("SELECT count(*) FROM mentorship_project WHERE program_id=$1", [p.id]))
        .rows[0].count,
    );
    const terms = Number(
      (await db.query("SELECT count(*) FROM program_term WHERE program_id=$1", [p.id])).rows[0]
        .count,
    );
    const eco = (
      await db.query("SELECT key, name, coverage_note FROM program_ecosystem WHERE program_id=$1", [
        p.id,
      ])
    ).rows;
    const prov = (
      await db.query(
        `SELECT DISTINCT ON (d.id) pr.id FROM provenance_record pr JOIN source_snapshot s ON s.id=pr.snapshot_id
         JOIN source_dataset d ON d.id=s.dataset_id JOIN source_provider sp ON sp.id=d.provider_id
         WHERE sp.program_key = $1 AND pr.derivation='direct' ORDER BY d.id, pr.id`,
        [p.slug === "gsoc" ? "gsoc" : "lfx-mentorship"],
      )
    ).rows.map((r) => Number(r.id));
    const src = await sources(db, prov);
    out.push({
      slug: p.slug,
      name: p.name,
      officialUrl: p.official_url,
      granularity: p.slug === "gsoc" ? "organization_year" : "project_term",
      years,
      organizations: orgs,
      mentorshipProjects: mps,
      terms,
      ecosystems: eco.map((e) => ({ key: e.key, name: e.name, note: e.coverage_note })),
      sources: [...src.values()],
    });
  }
  return out;
}

export async function getProgram(db: Db, slug: string) {
  const summary = (await listPrograms(db)).find((p) => p.slug === slug);
  if (!summary) return null;
  const cards = (await allCards(db)).filter((c) => c.program.slug === slug);
  if (slug === "gsoc") {
    const byYear = new Map<number, ProjectCard[]>();
    for (const c of cards)
      for (const y of c.terms) byYear.set(Number(y), [...(byYear.get(Number(y)) ?? []), c]);
    return {
      summary,
      kind: "gsoc" as const,
      years: [...byYear.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([year, orgs]) => ({ year, orgs })),
    };
  }
  const terms = (
    await db.query(
      `SELECT id, year, term_code, track, starts_on, ends_on FROM program_term WHERE program_id=(SELECT id FROM program WHERE slug=$1) ORDER BY year, term_code`,
      [slug],
    )
  ).rows;
  const raw = (
    await db.query(
      "SELECT program_term_id AS id, raw_term_name FROM mentorship_project_term WHERE program_term_id IS NOT NULL",
    )
  ).rows;
  return {
    summary,
    kind: "mentorship" as const,
    terms: terms.map((t) => {
      const label = termLabel(t.year, t.term_code, t.track);
      return {
        year: t.year as number,
        code: t.term_code as string,
        track: t.track as string,
        startsOn: t.starts_on ? new Date(t.starts_on).toISOString().slice(0, 10) : null,
        endsOn: t.ends_on ? new Date(t.ends_on).toISOString().slice(0, 10) : null,
        rawNames: [
          ...new Set(
            raw.filter((r) => Number(r.id) === Number(t.id)).map((r) => r.raw_term_name as string),
          ),
        ],
        projects: cards.filter((c) => c.terms.includes(label)),
      };
    }),
  };
}

export async function getProject(db: Db, id: string) {
  const card = (await allCards(db)).find((c) => c.id === id);
  if (!card) return null;
  const num = Number(id.split("-")[1]);
  if (card.kind === "organization") {
    const o = (
      await db.query(
        "SELECT website_url, source_code_url, license, tagline FROM organization WHERE id=$1",
        [num],
      )
    ).rows[0];
    const hist = (
      await db.query(
        `SELECT py.year, pa.status, pa.provenance_id FROM participation pa JOIN program_year py ON py.id=pa.program_year_id WHERE pa.organization_id=$1 ORDER BY py.year`,
        [num],
      )
    ).rows;
    const src = await sources(
      db,
      hist.map((h) => Number(h.provenance_id)),
    );
    return {
      card,
      detail: {
        websiteUrl: o.website_url as string | null,
        license: o.license as string | null,
        history: hist.map((h) => ({
          year: h.year as number,
          status: h.status as string,
          source: src.get(Number(h.provenance_id))!,
        })),
        mentors: [] as {
          name: string;
          githubLogin: string;
          roleLabel: string | null;
          status: string;
        }[],
        terms: [] as never[],
        maturity: null as string | null,
        conflicts: [] as { attribute: string; detail: string }[],
      },
      sources: [...src.values()],
    };
  }
  const m = (
    await db.query("SELECT cncf_maturity, lfx_project_uuid FROM mentorship_project WHERE id=$1", [
      num,
    ])
  ).rows[0];
  const terms = (
    await db.query(
      `SELECT t.raw_term_name, t.norm_status, t.norm_confidence, t.norm_reason, t.source_start, t.source_end, t.provenance_id, pt.year, pt.term_code, pt.track
       FROM mentorship_project_term t LEFT JOIN program_term pt ON pt.id=t.program_term_id WHERE t.mentorship_project_id=$1 ORDER BY pt.year`,
      [num],
    )
  ).rows;
  const mentors = (
    await db.query(
      `SELECT p.display_name, p.github_login, r.role_label, r.status, r.provenance_id FROM person_role r JOIN person p ON p.id=r.person_id
       WHERE r.mentorship_project_id=$1 AND r.role='official_mentor' ORDER BY r.role_label NULLS LAST, p.display_name`,
      [num],
    )
  ).rows;
  const conflicts = (
    await db.query(
      "SELECT attribute, detail FROM conflict WHERE entity_type='mentorship_project' AND entity_id=$1",
      [num],
    )
  ).rows;
  const src = await sources(db, [
    ...terms.map((t) => Number(t.provenance_id)),
    ...mentors.map((x) => Number(x.provenance_id)),
  ]);
  return {
    card,
    detail: {
      websiteUrl: null as string | null,
      license: null as string | null,
      history: [] as never[],
      maturity: m.cncf_maturity as string | null,
      terms: terms.map((t) => ({
        rawName: t.raw_term_name as string,
        normalized: t.year ? termLabel(t.year, t.term_code, t.track) : null,
        status: t.norm_status as string,
        confidence: t.norm_confidence as string,
        reason: t.norm_reason as string,
        start: t.source_start ? new Date(t.source_start).toISOString().slice(0, 10) : null,
        end: t.source_end ? new Date(t.source_end).toISOString().slice(0, 10) : null,
      })),
      mentors: mentors.map((x) => ({
        name: x.display_name as string,
        githubLogin: x.github_login as string,
        roleLabel: x.role_label as string | null,
        status: x.status as string,
      })),
      conflicts: conflicts as { attribute: string; detail: string }[],
    },
    sources: [...new Map([card.source, ...src.values()].map((s) => [s.provenanceId, s])).values()],
  };
}

export async function dataSnapshot(db: Db) {
  const datasets = (
    await db.query(`
      SELECT d.key, p.name AS provider, p.ingestion_status AS ingestion, p.tier, p.ecosystem_key AS ecosystem, s.origin, max(s.fetched_at) AS "fetchedAt"
      FROM source_dataset d JOIN source_provider p ON p.id=d.provider_id JOIN source_snapshot s ON s.dataset_id=d.id
      GROUP BY d.key, p.name, p.ingestion_status, p.tier, p.ecosystem_key, s.origin ORDER BY d.key`)
  ).rows;
  const n = async (sql: string) => Number((await db.query(sql)).rows[0].count);
  return {
    datasets: datasets.map((d) => ({
      ...d,
      tier: Number(d.tier),
      fetchedAt: new Date(d.fetchedAt).toISOString(),
    })) as {
      key: string;
      provider: string;
      ingestion: string;
      tier: number;
      ecosystem: string | null;
      origin: "recorded" | "live";
      fetchedAt: string;
    }[],
    counts: {
      organizations: await n("SELECT count(*) FROM organization"),
      mentorshipProjects: await n("SELECT count(*) FROM mentorship_project"),
      terms: await n("SELECT count(*) FROM program_term"),
      mentors: await n("SELECT count(*) FROM person"),
    },
  };
}

export async function dbHealth(db: Db) {
  const t0 = Date.now();
  await db.query("SELECT 1");
  const migrations = Number(
    (await db.query("SELECT count(*) FROM schema_migration")).rows[0].count,
  );
  return { ok: true, latencyMs: Date.now() - t0, migrations };
}
