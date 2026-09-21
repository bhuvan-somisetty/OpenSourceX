import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { assertNoContactData, inc } from "@opensourcex/shared";
import { withTx, type Db } from "@opensourcex/database";
import {
  PROVIDERS,
  assertMayPersist,
  type CncfExportBody,
  type GsocOrgsBody,
  type LfxProjectsBody,
  type SnapshotEnvelope,
} from "@opensourcex/providers";
import { linkUpstream, normalizeTerm } from "@opensourcex/entity-resolution";
import { shapeFingerprint } from "./resilience";

/**
 * M1a spike pipeline: recorded, sanitized snapshot -> validate -> normalize -> resolve ->
 * persist -> provenance (docs/INGESTION_PIPELINE.md). It never fetches. Each source is
 * isolated: one failing snapshot does not stop the others.
 */
const DATASETS = {
  "gsoc-orgs": { provider: "gsoc-archive", parser: "gsoc-orgs/v1", order: 1 },
  "lfx-projects": { provider: "lfx-mentorship-api", parser: "lfx-projects/v1", order: 2 },
  "cncf-lfx-export": { provider: "cncf-mentoring", parser: "cncf-lfx-export/v1", order: 3 },
} as const;
type DatasetKey = keyof typeof DATASETS;

const PROGRAMS = [
  { slug: "gsoc", name: "Google Summer of Code", url: "https://summerofcode.withgoogle.com" },
  { slug: "lfx-mentorship", name: "LFX Mentorship", url: "https://mentorship.lfx.dev/" },
];
const PUBLISHER: Record<string, string> = {
  "gsoc-archive": "Google Summer of Code",
  "lfx-mentorship-api": "Linux Foundation (LFX Mentorship)",
  "cncf-mentoring": "Cloud Native Computing Foundation",
};

export interface SpikeCounts {
  snapshots: number;
  organizations: number;
  participation: number;
  mentorshipProjects: number;
  terms: number;
  mentors: number;
  mentorsWithoutHandle: number;
  cncfWithoutUuid: number;
  links: number;
  conflicts: number;
  revisions: number;
}
export interface SpikeResult {
  counts: SpikeCounts;
  failures: { dataset: string; error: string }[];
}

const envelopeShape = z.object({
  provider: z.string(),
  dataset: z.enum(["gsoc-orgs", "lfx-projects", "cncf-lfx-export"]),
  url: z.string().url(),
  fetchedAt: z.string().datetime(),
  origin: z.enum(["recorded", "live"]),
  schemaVersion: z.string(),
  body: z.unknown(),
});

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}
const sha = (v: unknown) => createHash("sha256").update(stable(v)).digest("hex");
const isoDay = (sec: number | null) =>
  sec == null ? null : new Date(sec * 1000).toISOString().slice(0, 10);

type Ctx = { c: PoolClient; env: SnapshotEnvelope; snapshotId: number; counts: SpikeCounts };
type ProvOpts = {
  status: string;
  confidence: string;
  reason: string;
  derivation?: "direct" | "rule";
  ruleId?: string | null;
};

async function seed(c: PoolClient) {
  for (const p of PROGRAMS) {
    await c.query(
      `INSERT INTO program(slug,name,official_url) VALUES ($1,$2,$3)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, official_url=EXCLUDED.official_url`,
      [p.slug, p.name, p.url],
    );
  }
  await c.query(
    `INSERT INTO program_ecosystem(program_id,key,name,coverage_note)
     SELECT id,'cncf','CNCF','CNCF projects only; not the whole LFX Mentorship ecosystem'
     FROM program WHERE slug='lfx-mentorship'
     ON CONFLICT (program_id,key) DO NOTHING`,
  );
  for (const p of PROVIDERS) {
    await c.query(
      `INSERT INTO source_provider(key,name,tier,program_key,ecosystem_key,coverage,base_url,licence_note,ingestion_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (key) DO UPDATE SET licence_note=EXCLUDED.licence_note, ingestion_status=EXCLUDED.ingestion_status`,
      [
        p.key,
        p.name,
        p.tier,
        p.program,
        p.ecosystem,
        p.coverage,
        p.baseUrl,
        p.licenceNote,
        p.ingestion,
      ],
    );
  }
  for (const [key, d] of Object.entries(DATASETS)) {
    await c.query(
      `INSERT INTO source_dataset(provider_id,key,description,parser_version)
       SELECT id,$2,$2,$3 FROM source_provider WHERE key=$1
       ON CONFLICT (key) DO UPDATE SET parser_version=EXCLUDED.parser_version`,
      [d.provider, key, d.parser],
    );
  }
}

const FRESHNESS_DAYS: Record<DatasetKey, number> = {
  "gsoc-orgs": 30,
  "lfx-projects": 7,
  "cncf-lfx-export": 7,
};

async function seedFreshness(c: PoolClient) {
  for (const [k, days] of Object.entries(FRESHNESS_DAYS)) {
    await c.query(
      `INSERT INTO freshness_policy(dataset_key,max_age_days) VALUES ($1,$2)
       ON CONFLICT (dataset_key) DO UPDATE SET max_age_days=EXCLUDED.max_age_days`,
      [k, days],
    );
  }
}

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 15 * 60_000;

async function prov(x: Ctx, o: ProvOpts): Promise<number> {
  const tier = PROVIDERS.find((p) => p.key === x.env.provider)!.tier;
  const at = x.env.fetchedAt;
  const r = await x.c.query(
    `INSERT INTO provenance_record(snapshot_id,source_url,source_type,publisher,observed_at,last_verified_at,
       status,confidence,confidence_reason,derivation,rule_id)
     VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (snapshot_id, derivation, (coalesce(rule_id,'')), status, confidence)
     DO UPDATE SET last_verified_at = EXCLUDED.last_verified_at
     RETURNING id`,
    [
      x.snapshotId,
      x.env.url,
      tier === 1 ? "official_program" : "official_ecosystem",
      PUBLISHER[x.env.provider],
      at,
      o.status,
      o.confidence,
      o.reason,
      o.derivation ?? "direct",
      o.ruleId ?? null,
    ],
  );
  return r.rows[0].id;
}

async function programId(c: PoolClient, slug: string): Promise<number> {
  return (await c.query("SELECT id FROM program WHERE slug=$1", [slug])).rows[0].id;
}

async function revise(
  x: Ctx,
  type: string,
  id: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prevProv: number,
  newProv: number,
) {
  const changed: Record<string, unknown> = {};
  for (const k of Object.keys(after))
    if (stable(before[k] ?? null) !== stable(after[k] ?? null))
      changed[k] = { old: before[k] ?? null, new: after[k] ?? null };
  if (!Object.keys(changed).length) return false;
  await x.c.query(
    "INSERT INTO entity_revision(entity_type,entity_id,changed_fields,provenance_id,observed_at) VALUES ($1,$2,$3,$4,$5)",
    [
      type,
      id,
      JSON.stringify({ ...changed, _previous_provenance_id: prevProv }),
      newProv,
      x.env.fetchedAt,
    ],
  );
  x.counts.revisions++;
  return true;
}

async function link(
  x: Ctx,
  mpId: number,
  key: string,
  state: string,
  method: string,
  evidence: string,
  provId: number,
) {
  await x.c.query(
    `INSERT INTO entity_link(left_type,left_id,right_type,right_key,state,method,evidence,confidence,provenance_id)
     VALUES ('mentorship_project',$1,'github_url',$2,$3,$4,$5,'low',$6)
     ON CONFLICT (left_type,left_id,right_type,right_key) DO UPDATE SET provenance_id=EXCLUDED.provenance_id`,
    [mpId, key, state, method, evidence, provId],
  );
  x.counts.links++;
}

async function conflict(
  x: Ctx,
  type: string,
  id: number,
  attr: string,
  detail: string,
  a: number,
  b: number | null,
) {
  const r = await x.c.query(
    `INSERT INTO conflict(entity_type,entity_id,attribute,detail,provenance_a,provenance_b) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (entity_type,entity_id,attribute,detail) DO NOTHING`,
    [type, id, attr, detail, a, b],
  );
  x.counts.conflicts += r.rowCount ?? 0;
}

async function ingestGsoc(x: Ctx, body: GsocOrgsBody) {
  const pid = await programId(x.c, "gsoc");
  const year = (
    await x.c.query(
      `INSERT INTO program_year(program_id,year) VALUES ($1,$2) ON CONFLICT (program_id,year) DO UPDATE SET year=EXCLUDED.year RETURNING id`,
      [pid, body.year],
    )
  ).rows[0].id;
  // GSoC data is organization/year only (D-007). Past years are HISTORICAL records.
  const status = body.year < new Date().getUTCFullYear() ? "HISTORICAL" : "CONFIRMED";
  const provId = await prov(x, {
    status,
    confidence: "high",
    reason: "stated by the program archive",
  });
  for (const o of body.orgs) {
    const fields = {
      name: o.name,
      website_url: o.websiteUrl,
      source_code_url: o.sourceCode,
      license: o.license,
      tagline: o.tagline,
    };
    const ext = await x.c.query(
      "SELECT entity_id FROM external_identifier WHERE dataset_key='gsoc-orgs' AND id_type='gsoc_org_slug' AND value=$1",
      [o.slug],
    );
    let orgId: number;
    if (!ext.rowCount) {
      orgId = (
        await x.c.query(
          `INSERT INTO organization(name,website_url,source_code_url,license,tagline,provenance_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [
            fields.name,
            fields.website_url,
            fields.source_code_url,
            fields.license,
            fields.tagline,
            provId,
          ],
        )
      ).rows[0].id;
      await x.c.query(
        "INSERT INTO external_identifier(entity_type,entity_id,dataset_key,id_type,value) VALUES ('organization',$1,'gsoc-orgs','gsoc_org_slug',$2)",
        [orgId, o.slug],
      );
      x.counts.organizations++;
    } else {
      orgId = ext.rows[0].entity_id;
      const cur = (
        await x.c.query(
          "SELECT name,website_url,source_code_url,license,tagline,provenance_id FROM organization WHERE id=$1",
          [orgId],
        )
      ).rows[0];
      if (await revise(x, "organization", orgId, cur, fields, cur.provenance_id, provId)) {
        await x.c.query(
          "UPDATE organization SET name=$2,website_url=$3,source_code_url=$4,license=$5,tagline=$6,provenance_id=$7 WHERE id=$1",
          [
            orgId,
            fields.name,
            fields.website_url,
            fields.source_code_url,
            fields.license,
            fields.tagline,
            provId,
          ],
        );
      }
    }
    for (const [kind, values] of [
      ["tech", o.techTags],
      ["topic", o.topicTags],
      ["category", o.categories],
    ] as const) {
      for (const v of values) {
        await x.c.query(
          "INSERT INTO organization_tag(organization_id,kind,value) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [orgId, kind, v],
        );
      }
    }
    await x.c.query(
      `INSERT INTO participation(program_year_id,organization_id,granularity,status,provenance_id)
       VALUES ($1,$2,'organization_year',$3,$4)
       ON CONFLICT (program_year_id,organization_id) DO UPDATE SET status=EXCLUDED.status, provenance_id=EXCLUDED.provenance_id`,
      [year, orgId, status, provId],
    );
    x.counts.participation++;
  }
}

async function upsertMentorshipProject(
  x: Ctx,
  a: {
    uuid: string;
    title: string;
    repoLink: string | null;
    summary: string | null;
    provId: number;
  },
  opts: { createOnly?: boolean } = {},
) {
  const l = linkUpstream(a.repoLink);
  const pid = await programId(x.c, "lfx-mentorship");
  const cur = (
    await x.c.query(
      "SELECT id,title,raw_repo_link,provenance_id FROM mentorship_project WHERE lfx_project_uuid=$1",
      [a.uuid],
    )
  ).rows[0];
  if (!cur) {
    const id = (
      await x.c.query(
        `INSERT INTO mentorship_project(lfx_project_uuid,title,program_id,raw_repo_link,upstream_key,link_state,link_reason,summary,provenance_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [a.uuid, a.title, pid, a.repoLink, l.key, l.state, l.reason, a.summary, a.provId],
      )
    ).rows[0].id;
    x.counts.mentorshipProjects++;
    return { id: id as number, link: l };
  }
  // Source authority: the LFX API owns title and repo link. The CNCF pass only creates a missing row.
  if (opts.createOnly) return { id: cur.id as number, link: l };
  if (
    await revise(
      x,
      "mentorship_project",
      cur.id,
      { title: cur.title, raw_repo_link: cur.raw_repo_link },
      { title: a.title, raw_repo_link: a.repoLink },
      cur.provenance_id,
      a.provId,
    )
  ) {
    await x.c.query(
      "UPDATE mentorship_project SET title=$2,raw_repo_link=$3,upstream_key=$4,link_state=$5,link_reason=$6,provenance_id=$7 WHERE id=$1",
      [cur.id, a.title, a.repoLink, l.key, l.state, l.reason, a.provId],
    );
  }
  return { id: cur.id as number, link: l };
}

async function ingestLfx(x: Ctx, body: LfxProjectsBody) {
  const pid = await programId(x.c, "lfx-mentorship");
  const direct = await prov(x, {
    status: "CONFIRMED",
    confidence: "high",
    reason: "stated by the LFX Mentorship API",
  });
  for (const p of body.projects) {
    const mp = await upsertMentorshipProject(x, {
      uuid: p.projectUuid,
      title: p.title,
      repoLink: p.repoLink,
      summary: p.summary,
      provId: direct,
    });
    if (mp.link.key)
      await link(x, mp.id, mp.link.key, mp.link.state, "url-parse", mp.link.reason, direct);
    for (const t of p.terms) {
      const n = normalizeTerm({ rawName: t.rawName, startSec: t.startSec, endSec: t.endSec });
      const status = n.status === "UNKNOWN" ? "UNKNOWN" : n.status;
      const tp = await prov(x, {
        status,
        confidence: n.confidence,
        reason: n.reason,
        derivation: "rule",
        ruleId: "term-normalization/v1",
      });
      let termId: number | null = null;
      if (n.year && n.termCode && n.startsOn) {
        const track = n.track ?? "unspecified";
        // canonical window is first-seen; per-project dates vary slightly and never overwrite it
        await x.c.query(
          `INSERT INTO program_term(program_id,year,term_code,track,starts_on,ends_on,provenance_id) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (program_id,year,term_code,track) DO NOTHING`,
          [pid, n.year, n.termCode, track, n.startsOn, n.endsOn, tp],
        );
        termId = (
          await x.c.query(
            "SELECT id FROM program_term WHERE program_id=$1 AND year=$2 AND term_code=$3 AND track=$4",
            [pid, n.year, n.termCode, track],
          )
        ).rows[0].id;
      }
      await x.c.query(
        `INSERT INTO term_alias(program_id,raw_text,term_code,year,method,confidence,provenance_id) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (program_id,raw_text) DO UPDATE SET provenance_id=EXCLUDED.provenance_id`,
        [
          pid,
          t.rawName,
          n.termCode,
          n.year,
          n.startsOn ? "date-rule" : "name-hint",
          n.confidence,
          tp,
        ],
      );
      const mt = await x.c.query(
        `INSERT INTO mentorship_project_term(mentorship_project_id,program_term_id,raw_term_name,norm_status,norm_confidence,norm_reason,source_start,source_end,provenance_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (mentorship_project_id,raw_term_name) DO UPDATE SET program_term_id=EXCLUDED.program_term_id, norm_status=EXCLUDED.norm_status,
           norm_confidence=EXCLUDED.norm_confidence, norm_reason=EXCLUDED.norm_reason, provenance_id=EXCLUDED.provenance_id
         RETURNING id`,
        [
          mp.id,
          termId,
          t.rawName,
          status,
          n.confidence,
          n.reason,
          isoDay(t.startSec),
          isoDay(t.endSec),
          tp,
        ],
      );
      x.counts.terms++;
      if (n.status === "CONFLICTING")
        await conflict(x, "mentorship_project_term", mt.rows[0].id, "term", n.reason, tp, null);
    }
  }
}

async function ingestCncf(x: Ctx, body: CncfExportBody) {
  const direct = await prov(x, {
    status: "CONFIRMED",
    confidence: "high",
    reason: "stated by the CNCF mentoring repository (CNCF projects only)",
  });
  const eco = (
    await x.c.query(
      "SELECT e.id FROM program_ecosystem e JOIN program p ON p.id=e.program_id WHERE p.slug='lfx-mentorship' AND e.key='cncf'",
    )
  ).rows[0].id;
  for (const p of body.programs) {
    if (!p.lfxProjectUuid) {
      x.counts.cncfWithoutUuid++;
      continue;
    }
    const mp = await upsertMentorshipProject(
      x,
      {
        uuid: p.lfxProjectUuid,
        title: p.title,
        repoLink: p.upstreamIssueUrl,
        summary: p.summary,
        provId: direct,
      },
      { createOnly: true },
    );
    const before = (
      await x.c.query("SELECT upstream_key, provenance_id FROM mentorship_project WHERE id=$1", [
        mp.id,
      ])
    ).rows[0];
    await x.c.query(
      "UPDATE mentorship_project SET ecosystem_id=$2, cncf_project_slug=$3, cncf_maturity=$4, technologies=$5 WHERE id=$1",
      [mp.id, eco, p.slug, p.maturity, p.technologies],
    );
    const cncfLink = linkUpstream(p.upstreamIssueUrl);
    if (cncfLink.key)
      await link(
        x,
        mp.id,
        cncfLink.key,
        cncfLink.state,
        "cncf-upstream-issue-url",
        cncfLink.reason,
        direct,
      );
    if (before.upstream_key && cncfLink.key && before.upstream_key !== cncfLink.key) {
      await conflict(
        x,
        "mentorship_project",
        mp.id,
        "upstream",
        `LFX repoLink ${before.upstream_key} vs CNCF upstream ${cncfLink.key}`,
        before.provenance_id,
        direct,
      );
    }
    for (const m of p.mentors) {
      if (!m.githubHandle) {
        x.counts.mentorsWithoutHandle++;
        continue;
      }
      const person = await x.c.query(
        `INSERT INTO person(display_name,github_login,provenance_id) VALUES ($1,$2,$3)
         ON CONFLICT (lower(github_login)) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
        [m.name, m.githubHandle, direct],
      );
      await x.c.query(
        `INSERT INTO person_role(person_id,role,mentorship_project_id,role_label,status,provenance_id)
         VALUES ($1,'official_mentor',$2,$3,'CONFIRMED',$4)
         ON CONFLICT (person_id,role,mentorship_project_id) DO UPDATE SET role_label=EXCLUDED.role_label, provenance_id=EXCLUDED.provenance_id`,
        [person.rows[0].id, mp.id, m.role, direct],
      );
      x.counts.mentors++;
    }
  }
}

const emptyCounts = (): SpikeCounts => ({
  snapshots: 0,
  organizations: 0,
  participation: 0,
  mentorshipProjects: 0,
  terms: 0,
  mentors: 0,
  mentorsWithoutHandle: 0,
  cncfWithoutUuid: 0,
  links: 0,
  conflicts: 0,
  revisions: 0,
});

export interface SpikeOptions {
  /** injectable clock for circuit-breaker tests */
  now?: Date;
}

/**
 * Per-source isolation: a failing, drifting or circuit-open source never blocks the others.
 * Sync state records attempts, successes, consecutive failures and the last good payload shape.
 */
export async function runSpike(
  pool: Db,
  envelopes: SnapshotEnvelope[],
  opts: SpikeOptions = {},
): Promise<SpikeResult> {
  const now = opts.now ?? new Date();
  await withTx(pool, async (c) => {
    await seed(c);
    await seedFreshness(c);
  });
  const counts = emptyCounts();
  const failures: SpikeResult["failures"] = [];
  const ordered = [...envelopes].sort(
    (a, b) =>
      (DATASETS[a.dataset as DatasetKey]?.order ?? 9) -
      (DATASETS[b.dataset as DatasetKey]?.order ?? 9),
  );
  for (const env of ordered) {
    const known = env.dataset in DATASETS;
    const dsId: number | null = known
      ? ((await pool.query("SELECT id FROM source_dataset WHERE key=$1", [env.dataset])).rows[0]
          ?.id ?? null)
      : null;
    const fail = async (error: string, countAgainstCircuit: boolean) => {
      failures.push({ dataset: env.dataset, error });
      inc("sync_failure_total", { dataset: env.dataset });
      if (dsId && countAgainstCircuit) {
        const openUntil = new Date(now.getTime() + CIRCUIT_OPEN_MS);
        await pool.query(
          `INSERT INTO sync_state(dataset_id,last_attempt_at,consecutive_failures,circuit_open_until)
           VALUES ($1,$2,1,NULL)
           ON CONFLICT (dataset_id) DO UPDATE SET last_attempt_at=EXCLUDED.last_attempt_at,
             consecutive_failures = sync_state.consecutive_failures + 1,
             circuit_open_until = CASE WHEN sync_state.consecutive_failures + 1 >= $3 THEN $4::timestamptz
                                       ELSE sync_state.circuit_open_until END`,
          [dsId, now, CIRCUIT_THRESHOLD, openUntil],
        );
      }
    };
    try {
      const shape = envelopeShape.parse(env);
      assertMayPersist(env.provider, env.origin); // pending providers: recorded snapshots only
      if (DATASETS[shape.dataset].provider !== env.provider)
        throw new Error("dataset does not belong to provider");
      assertNoContactData(env.body); // fail closed before anything is stored
      const fp = shapeFingerprint(env.body);
      const st = (await pool.query("SELECT * FROM sync_state WHERE dataset_id=$1", [dsId])).rows[0];
      if (st?.circuit_open_until && new Date(st.circuit_open_until) > now) {
        await fail(`circuit open until ${new Date(st.circuit_open_until).toISOString()}`, false);
        continue;
      }
      if (st?.source_shape_hash && st.source_shape_hash !== fp) {
        // source or schema change: hold the batch, keep the last good data visible
        await pool.query(
          `INSERT INTO quarantine(dataset_id,reason,expected_shape_hash,observed_shape_hash,snapshot_hash)
           VALUES ($1,'payload shape changed',$2,$3,$4) ON CONFLICT DO NOTHING`,
          [dsId, sha(st.source_shape_hash), sha(fp), sha(env.body)],
        );
        inc("sync_quarantine_total", { dataset: env.dataset });
        await fail("schema drift: batch quarantined", false);
        continue;
      }
      await withTx(pool, async (c) => {
        const snap = await c.query(
          `INSERT INTO source_snapshot(dataset_id,url,fetched_at,content_hash,schema_version,sanitized_body,origin)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (dataset_id,content_hash) DO UPDATE SET url=EXCLUDED.url RETURNING id`,
          [
            dsId,
            env.url,
            env.fetchedAt,
            sha(env.body),
            env.schemaVersion,
            JSON.stringify(env.body),
            env.origin,
          ],
        );
        const x: Ctx = { c, env, snapshotId: snap.rows[0].id, counts };
        counts.snapshots++;
        if (env.dataset === "gsoc-orgs") await ingestGsoc(x, env.body as GsocOrgsBody);
        else if (env.dataset === "lfx-projects") await ingestLfx(x, env.body as LfxProjectsBody);
        else await ingestCncf(x, env.body as CncfExportBody);
        await c.query(
          "INSERT INTO sync_run(dataset_id,finished_at,status,counts) VALUES ($1,now(),'ok',$2)",
          [dsId, JSON.stringify(counts)],
        );
        await c.query(
          `INSERT INTO sync_state(dataset_id,last_attempt_at,last_success_at,consecutive_failures,circuit_open_until,source_shape_hash,parser_version)
           VALUES ($1,$2,$2,0,NULL,$3,$4)
           ON CONFLICT (dataset_id) DO UPDATE SET last_attempt_at=EXCLUDED.last_attempt_at, last_success_at=EXCLUDED.last_success_at,
             consecutive_failures=0, circuit_open_until=NULL, source_shape_hash=EXCLUDED.source_shape_hash, parser_version=EXCLUDED.parser_version`,
          [dsId, now, fp, DATASETS[shape.dataset].parser],
        );
      });
      inc("sync_success_total", { dataset: env.dataset });
    } catch (e) {
      await fail(e instanceof Error ? e.message : "unknown", true);
    }
  }
  return { counts, failures };
}
