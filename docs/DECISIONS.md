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

## D-017 UI/UX direction approved (2026-09-21)

- Decision: the "evidence atlas" direction, tokens and page structure in
  DESIGN_SYSTEM.md and UI_UX_SPECIFICATION.md are approved, after responsive
  verification and fixes. M4 implements them and must keep the quality bar:
  premium, distinctive, source-transparent, not a generic admin dashboard.

## D-018 AI is off by default; budgets are proposals (2026-09-21)

- Decision: `AI_ENABLED` defaults to false and no LLM provider is connected.
  Token budgets, request limits, caching, fallback and context caps are
  defined as proposed defaults (AI_ARCHITECTURE.md). Production activation
  requires explicit owner approval (Q5, Q26).

## D-019 Source permission review outcome (2026-09-21)

- Context: Q2 and Q18 required a source-by-source terms review (SOURCE_PERMISSIONS.md).
- Decision: LFX Mentorship API is **blocked** (its Acceptable Use Policy prohibits
  data mining and robots); GSoC is **pending** (program terms unreadable); CNCF
  and GitHub are **conditional** on owner approval. Nothing is approved and live
  ingestion stays off. If a source cannot provide a dataset, another legitimate
  source provides it (provider architecture, D-013); the product scope is unchanged.
- Trade-offs: LFX term history beyond CNCF projects waits for permission or
  another licensed source.

## D-020 Owner approves official program lists as sources (2026-10-15)

- Context: Q2 left GSoC "pending" and the other programs unreviewed, so only LFX had
  real data. The owner asked for real organization data, repository links, community
  links and logos for every program.
- Decision: the owner approves using each program's own public organization list as
  the source: the GSoC organization archive (2022 to 2026), Season of Docs participants
  page, Outreachy round pages (CC BY 3.0), Summer of Bitcoin's organization feed, the
  ESoC GitHub README, the OSPP organization API, C4GT DMP 2025 tickets, the MLH
  Fellowship partners page, and the Igalia and Processing Foundation program pages.
  Repository, logo and chat links that a list does not carry come from the
  organization's own GitHub account, README or website. Nothing is inferred: when a
  match is not exact the field stays empty.
- How: `scripts/programs/collect.mjs` fetches once and writes
  `apps/web/data/programs/<program>.json` plus logos under
  `apps/web/public/logos/programs/`. Both are committed, so the site never fetches
  live and the data survives a lost working copy. Only organization-level fields are
  stored; no personal data (emails, mentor or intern names) is kept.
- Program details (stipend, payments, eligibility, timeline, how to apply) live in
  `apps/web/data/programs/info/<program>.json`, written from each program's official
  pages. `scripts/programs/snapshot-sources.mjs` saves text copies of those pages under
  `info/sources/` and the published per-country stipend tables under `info/stipends/`,
  so every figure can be checked even if a program site changes.
- Trade-offs: data is a snapshot dated in each file and must be re-collected to stay
  current; organizations can ask for removal, which is honored.

## D-021 Ask becomes an open source chat with free AI providers (2026-10-17)

- Context: the owner asked for Ask to work like ChatGPT and Claude: one composer,
  chat history, and answers to any open source question, including organization
  repositories, chat links and organizations that repeat across every program.
  This resolves Q5 and Q26 (provider and budget).
- Decision: Ask supports four engines, tried in order: Vercel AI Gateway, Anthropic
  API, OpenAI API (each used only when configured) and an offline engine that needs
  no AI. The budget is zero: defaults are low-cost models on the free AI Gateway
  allowance, capped at 25 AI answers per user and 200 site-wide in any 24 hours
  (ASK_AI_PER_USER_DAY, ASK_AI_GLOBAL_DAY). Past the caps, or when every provider
  fails, the offline engine answers. Models see OpenSourceX data only through
  read-only tools, and links to organizations come only from recorded data.
- Chat history is stored per session user in Postgres (migration 007).

## D-022 Free AI providers and an open source knowledge base for Ask (2026-10-17)

- Context: in production almost every Ask answer was off-topic. Vercel AI Gateway refuses
  requests until a credit card is on file, so every question fell back to the offline engine,
  which only knew organization and program data. The owner asked for complete, relevant answers
  at zero cost, using four reference proposals they provided.
- Decision: add Google Gemini and Groq, whose free API keys need no card, tried before the
  Gateway. A provider that fails is skipped for five minutes. Add a knowledge base (migration 008,
  `pnpm db:knowledge`) of curated guides written from official program documentation (LFX, CNCF,
  GSoC, Outreachy) and the four reference proposals, with names, emails, handles, schools and
  mentor names removed. It is searched with Postgres full-text search, so no paid embeddings
  are needed. Both the AI (searchKnowledge tool) and the offline engine answer from it.

## D-023 Ask uses free public APIs live (2026-10-17)

- Context: the owner asked to use the free APIs catalogued in github.com/public-apis/public-apis.
- Decision: Ask calls no-key APIs from that catalog live, at answer time and read-only: GitHub
  REST and search (repo stats, good first issues, repo search), npm, PyPI, crates.io, RubyGems,
  Packagist, NuGet, the Go module proxy, OSV.dev, Hacker News (Algolia search), Stack Exchange and
  Wikipedia. Results are never stored. They are cached for ten minutes, time out after eight
  seconds, and are stripped of email addresses, and every answer names the live source.
  `ASK_LIVE_APIS=false` turns them off. This is question-time lookup, not ingestion:
  `DATA_MODE` and source-ingestion rules (D-019) are unchanged. Unrelated catalog entries
  (weather, games, finance and so on) are not integrated.

## D-024 More free AI providers; FreeLLMAPI stays out of production (2026-10-17)

- Context: the owner asked to use FreeLLMAPI (github.com/tashfeenahmed/freellmapi), a self-hosted
  router that stacks about 34 providers' free tiers behind one OpenAI-compatible endpoint.
- Decision: its README and terms review limit it to personal, single-user use. They say not to
  share the endpoint with other people and not to use free tiers as a production backend. It
  also needs an always-on server with SQLite, which Vercel does not provide. So OpenSourceX
  production does not route through it. Instead Ask calls two of the providers its review marks
  "likely OK" directly, Cerebras and OpenRouter free models (`CEREBRAS_API_KEY`,
  `OPENROUTER_API_KEY`), after Gemini and Groq. A generic OpenAI-compatible endpoint
  (`ASK_COMPAT_BASE_URL`) lets a developer point a local build at their own FreeLLMAPI or Ollama.
  Migration 009 allows the new engine names.
