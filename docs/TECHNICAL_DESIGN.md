# Technical Design

## Stack
TypeScript everywhere. Web: Next.js App Router. API: Fastify + zod. DB:
PostgreSQL with `pg` and SQL migrations. Queue: pg-boss. Tests: Vitest,
Playwright for E2E. Lint/format: ESLint, Prettier. CI: GitHub Actions.

## Source adapters
Interface: `fetch(cursor) -> RawSnapshot[]`, `normalize(snapshot) -> Facts`.
Adapters: `gsoc-archive`, `lfx-mentorship`, `github`. Each declares its tier,
rate limit and User-Agent. Adapters never write to the database directly.

## Normalization
- GSoC: org slug is the stable key per year; join across years by slug and
  by resolved GitHub org/repo where available.
- LFX: program term mapped from `programTerms` (name + dates) to a canonical
  term (season + year) by start date; unmatched names are kept raw.
- Repository linking: resolve `repoLink`/`source_code` URLs through GitHub;
  org-level URLs become an organization link, not a repository.
- Entity matching is confidence-scored; low confidence is stored as
  INFERRED, never CONFIRMED.

## Activity evidence
Computed from GitHub data over windows (30/90/365 days): commits, PRs
opened/merged, issues opened/closed, releases, distinct contributors.
Output is a per-dimension label (Recent/Moderate/Low/None) with the raw
counts and window; no aggregate score.

## Caching
API responses cached per resource with TTL tied to freshness policy; GitHub
uses ETags.

## Errors
Typed errors map to HTTP problem+json. Source failures degrade to
stale/partial states, never to fabricated values.
