# Decisions

Format: Decision, Context, Options, Reason, Trade-offs, Date.

## D-001 TypeScript monorepo, no microservices (2026-09-21)

- Context: early planning proposed several services.
- Options: polyglot services; single TypeScript monorepo.
- Decision: TypeScript monorepo with modular packages.
- Reason: small team, simpler operations.
- Trade-offs: heavy ML work would need a Python boundary later.

## D-002 pg-boss instead of Redis/BullMQ for the MVP (2026-09-21)

- Context: background jobs are needed.
- Options: BullMQ + Redis; pg-boss on Postgres.
- Decision: pg-boss.
- Reason: one fewer service to run.
- Trade-offs: lower throughput ceiling; revisit if volume demands.

## D-003 Undocumented program endpoints behind adapters (2026-09-21, amended same day)

- Context: GSoC and LFX expose no documented public API (DATA_SOURCES.md).
- Decision: isolate in provider modules, sanitize, store snapshots, throttle.
- Amendment: throttling alone is not sufficient. `mentorship.lfx.dev`
  disallows all crawlers in robots.txt and neither program's terms were
  read, so both paths are `pending` and not used in production until
  approved (D-014).
- Trade-offs: breakage risk if endpoints change; possible loss of a source.

## D-004 No aggregate health score (2026-09-21)

- Decision: show evidence per dimension instead.
- Reason: explainability and trust.

## D-005 No vector database in the MVP (2026-09-21)

- Decision: structured retrieval plus Postgres text search first.
- Reason: no evidence yet that it is needed.

## D-006 OpenSourceX is a proprietary platform, not an open-source project (2026-09-21)

- Context: the product teaches people about open source; it is not itself
  meant to be open source.
- Decision: private repository, no LICENSE file, no CONTRIBUTING guide, no
  community-contribution workflow.
- Reason: owner's product intent.
- Trade-offs: no external contributions; revisit only if the owner decides
  to open the code.
- Clarification: this concerns _this repository_. The product's purpose is
  to help users contribute to _other_ open-source projects; that remains a
  core feature (PRD 5a).

## D-007 GSoC participation is organization/year level (2026-09-21)

- Context: verified GSoC data is organization per year; the projects
  endpoint returns 403; no mentor or project fields exist.
- Options: infer project-level participation; model only the verified grain.
- Decision: model participation with an explicit grain
  (`organization_year`, `project_year`, `project_term`). GSoC is
  `organization_year`. Project-level, mentor-level or historical facts that
  cannot be verified from an authoritative source display "Not verified".
  Reliable project-level evidence from another authoritative source may be
  attached separately with its own provenance. Ecosystem idea files are
  proposals, not participation.
- Trade-offs: less impressive GSoC pages, but no false claims.

## D-008 Hybrid data model (2026-09-21)

- Context: a generic fact table was proposed.
- Options: generic fact/EAV; fully typed; hybrid.
- Decision: strongly typed tables for core entities, first-class
  source/provenance tables, real relationships, JSON only where justified
  (DATA_MODEL.md section 7). No giant generic Fact table.
- Reason: relational integrity, queryability and provenance together.
- Trade-offs: more migrations when adding entities.

## D-009 MVP API architecture: Next.js Route Handlers plus worker (2026-09-21)

- Decision: Next.js app with Route Handlers, PostgreSQL, and a background
  worker. No separate NestJS/Fastify API service in the MVP. Business logic
  lives in framework-independent packages so a service can be split out
  later. Split only if implementation evidence shows a real need.
- Trade-offs: web and API scale together until split.

## D-010 Transparent recommendations, no numeric score (2026-09-21)

- Decision: show matching criteria with sources; never show "87/100" or an
  opaque score. Ordering uses a documented, explainable relevance strategy
  and is not presented as universal quality (RECOMMENDATION_ENGINE.md).

## D-011 Deep PR intelligence in Phase 2 (2026-09-21)

- Decision: MVP shows basic PR metadata (counts, recent and merged
  activity, links). Changed-file, review, contribution-specific and
  root-cause analysis and contribution interview generation are Phase 2.
- Trade-offs: the "explain my PR" persona is served after MVP.

## D-012 Contribution and conduct files not needed (2026-09-21)

- Decision: no CONTRIBUTING.md and no CODE_OF_CONDUCT.md while the
  repository is proprietary and closed to external contributions. The
  security contact stays unassigned until the owner supplies a real address;
  none is invented (SECURITY.md).

## D-013 CNCF is an ecosystem inside LFX, not all of LFX (2026-09-21)

- Decision: model `LFX Mentorship > ecosystem > provider`. The CNCF
  mentoring repository is a Tier 2 provider covering CNCF projects only,
  labeled everywhere as such. The provider architecture supports more
  ecosystems and official LFX sources later.

## D-014 Data policy: permission-gated, minimal, attributed (2026-09-21)

- Decision: DATA_POLICY.md governs ingestion. Each provider is
  `approved`, `pending` or `blocked`; none is approved yet. Never ingest
  contact data (emails, LFIDs), including from `lfx-export.json` and
  markdown, not only the CSV. Allowlist parsers; raw bodies of email-bearing
  files are never persisted. CC BY 4.0 attribution shown for CNCF content.
- Trade-offs: extra sanitizer work; some sources wait for permission.

## D-015 Term normalization and entity resolution by evidence (2026-09-21)

- Decision: canonical terms derive from dates first, with alias tables and
  preserved raw values (INGESTION_PIPELINE.md section 3). Entities resolve
  by stable ids first, corroborated signals second, never name equality
  alone (ENTITY_RESOLUTION.md). Research counts (1,301 LFX projects, 151
  term spellings, 1,162/78/61 repo links) are findings, not constants.

## D-016 Automatic updates as a staged pipeline (2026-09-21)

- Decision: source -> discover -> fetch -> validate -> sanitize -> normalize
  -> resolve -> deduplicate -> compare -> persist -> provenance ->
  freshness -> expose, with incremental sync, retries, failed-source
  isolation, quarantine on schema drift and historical preservation
  (INGESTION_PIPELINE.md). Status derives from dates, not source prose.
