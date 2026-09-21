# OpenSourceX

An intelligence layer for navigating open source: programs, organizations,
projects and repositories connected, with the source of every fact shown.

> **Status: early development.** The foundation and a local ingestion spike are
> built and tested. No data source is connected in production and no product
> features are live. This repository is public for visibility; it is
> proprietary and not licensed for reuse (see [License and reuse](#license-and-reuse)).

## Why it exists

Finding an open-source project to contribute to means combining program
websites, GitHub, project docs and a chatbot by hand. The pieces are
disconnected, often outdated, and rarely say how far to trust them.
OpenSourceX aims to connect them and show where every fact came from.

## What it aims to do

- **Program intelligence:** Google Summer of Code (organization/year level) and
  LFX Mentorship (term level), including CNCF-ecosystem mentors and selections.
- **Repository intelligence:** metadata, languages, contributors, issues, PR
  activity, releases, contribution docs, and an activity evidence table (no
  single score).
- **Discovery and recommendations:** transparent "why this matches" criteria,
  never an opaque match score.
- **Learning and interview practice:** project-specific learning paths and
  grounded interview feedback that helps users understand, not pretend.
- **Provenance everywhere:** source, tier, verified date and status
  (confirmed, historical, inferred, forecast, unknown, stale, conflicting).

## What exists today

| Area                                   | State                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Foundation (M0)                        | Done: pnpm workspace, Next.js app with Route Handlers, worker, migrations, CI    |
| Sanitized ingestion spike (M1a)        | Done, local only: recorded snapshots to Postgres with provenance                 |
| M1b preparation                        | Done: provider contract, sync state, circuit breaker, quarantine, freshness view |
| Production ingestion (M1b)             | **Blocked** on source permission and licensing (Q2, Q18); live access is off     |
| API, GitHub intelligence, web UI, etc. | Planned (M2 to M6)                                                               |
| UI design                              | Approved and responsive-verified; preview in `docs/design/preview.html`          |
| AI features                            | Off by default; no provider connected                                            |

Roadmap and order: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Architecture

```
Next.js app (UI + Route Handlers) -> PostgreSQL <- Background worker (pg-boss)
                                        ^
                       Providers: GSoC, LFX, CNCF mentoring, GitHub
```

TypeScript monorepo. No separate API service in the MVP. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
apps/web         Next.js UI and Route Handlers
apps/worker      background worker
packages/shared  env, logger, errors, contact-data guard, metrics, AI budget guard
packages/db      client and SQL migrations
packages/domain  term normalization, GitHub URL parsing, entity resolution
packages/providers  source providers, sanitizers, recorded fixtures
packages/ingest  ingestion pipeline and sync state
docs/            product, architecture, data, security and design documents
```

## Data and privacy principles

- Real, source-backed data only; unknowns are shown as "Not verified".
- GSoC participation is organization/year level; it is never inferred for a
  project.
- CNCF data covers CNCF projects only, not all of LFX Mentorship.
- Contact data (emails, LFIDs) is never ingested, stored, logged or exposed.
- No source is ingested live until its terms, robots policy and licence are
  cleared. Details: [docs/DATA_POLICY.md](docs/DATA_POLICY.md).

## Getting started (development)

Prerequisites: Node 24, pnpm 12, Docker.

```
pnpm install
cp .env.example .env
docker compose up -d --wait db
export DATABASE_URL=postgres://osx:osx_dev_password@localhost:5433/opensourcex
pnpm db:migrate
pnpm dev            # web app
pnpm dev:worker     # worker
pnpm test           # unit tests
pnpm test:integration
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.
More in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

Start with [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) and
[docs/PRD.md](docs/PRD.md), then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), [docs/DATA_POLICY.md](docs/DATA_POLICY.md)
and [docs/DATA_MODEL.md](docs/DATA_MODEL.md). Design:
[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) and
[docs/UI_UX_SPECIFICATION.md](docs/UI_UX_SPECIFICATION.md). Requirement
coverage: [docs/TRACEABILITY.md](docs/TRACEABILITY.md). Decisions:
[docs/DECISIONS.md](docs/DECISIONS.md). Unresolved items:
[docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md).

## Security

See [SECURITY.md](SECURITY.md). No dedicated security contact has been
designated yet.

## License and reuse

This is a proprietary product repository. It is publicly visible but not
licensed for reuse or redistribution, and it does not accept external
contributions. Third-party data excerpts in test fixtures carry their own terms
and attribution:
[packages/providers/fixtures/ATTRIBUTION.md](packages/providers/fixtures/ATTRIBUTION.md).
