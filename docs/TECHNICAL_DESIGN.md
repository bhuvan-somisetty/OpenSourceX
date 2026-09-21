# Technical Design

## Stack

TypeScript everywhere. Web and API layer: Next.js App Router with Route
Handlers (D-009). Worker: Node/TypeScript with pg-boss. DB: PostgreSQL with
SQL migrations and typed queries (D-008). Tests: Vitest, Playwright for E2E.
Lint/format: ESLint, Prettier. CI: GitHub Actions. Module layout:
ARCHITECTURE.md.

## Providers

Each source is a provider module (`services/providers`) with the pipeline in
INGESTION_PIPELINE.md: `discover`, `fetch`, `sanitize`, `parse`, plus
metadata (tier, ecosystem, coverage, terms status, cadence, rate budget).
Providers never write to the database; the worker persists. Providers:
`gsoc-archive`, `lfx-mentorship-api`, `cncf-mentoring`, `github`. The first
three stay `pending` until approved (DATA_POLICY.md).

## Normalization and resolution

Term normalization: INGESTION_PIPELINE.md section 3 (dates first; alias
table; raw value preserved; no string-only mapping). Entity resolution:
ENTITY_RESOLUTION.md (stable ids first; INFERRED links carry reasons;
ambiguous goes to review).

## Activity evidence

Computed from GitHub data over windows (30/90/365 days): commits, PRs
opened/merged, issues opened/closed, releases, distinct contributors.
Output is a per-dimension label (Recent/Moderate/Low/None) with the raw
counts and window; no aggregate score.

## Caching

API responses cached per resource with TTL tied to freshness policy; GitHub
uses ETags. Raw source data is cached only in sanitized form (DATA_POLICY).

## Errors

Typed errors map to HTTP problem+json. Source failures degrade to
stale/partial states, never to fabricated values.

## M2 and M3 plans (refined, not implemented)

**M2 API:** Route Handlers over `services/entity-resolution` for `/programs`,
`/programs/{slug}/history` (with granularity), `/programs/{slug}/ecosystems`,
`/projects`, `/sources`, and `/health`. zod request and response schemas in
`packages/shared`, OpenAPI generated from them, cursor pagination, problem+json
errors, provenance object on every fact, no contact fields.

**M3 GitHub intelligence (MVP scope only):** repository metadata, languages,
contributors, commits, issues, PR metadata and activity (counts, recent and
merged), releases, repository documentation and contribution documentation,
and the activity evidence table. Uses a GitHub App or read-only token (Q21)
with ETag caching, a reserved sync budget separate from user-triggered
analysis, per-IP limits and per-repository cooldown, and the SSRF-safe URL
parser. Roles stay distinct (contributor, reviewer, merger, maintainer,
official mentor). Deep PR and code intelligence stay Phase 2 (D-011).
