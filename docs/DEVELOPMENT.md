# Development

Run OpenSourceX locally on **recorded, sanitized data**. No live source is
ever contacted (`DATA_MODE=recorded`; live mode is refused in code until
source permissions are approved, see SOURCE_PERMISSIONS.md).

## Prerequisites

Node 24, pnpm 12, Docker (running), Git.

## Run everything (one command)

```
pnpm install
pnpm dev
```

`pnpm dev` (`scripts/dev.mjs`) does, in order:

1. starts PostgreSQL with `docker compose up -d --wait db` (host port **5433**)
2. runs migrations (`pnpm db:migrate`)
3. loads the recorded fixtures into the database (`pnpm db:seed`, no network)
4. starts the background worker (live ingestion off)
5. starts the web app

Then open **http://localhost:3001** (landing). Click _Get Started_, then _Continue in Development Mode_ (a labeled local session; real sign-in is not connected). Health check:
**http://localhost:3001/api/v1/health** (reports database, data mode, live and AI flags).

PostgreSQL must be able to start: if Docker is not running, `pnpm dev` stops
with a clear message. Database credentials in `docker-compose.yml` are for
local use only. Optional: copy `.env.example` to `.env` to override settings.

## Individual steps

| Command                          | What it does                             |
| -------------------------------- | ---------------------------------------- |
| `docker compose up -d --wait db` | start PostgreSQL                         |
| `pnpm db:migrate`                | apply SQL migrations                     |
| `pnpm db:seed`                   | load recorded fixtures (idempotent)      |
| `pnpm db:reseed`                 | clear local data and reload the fixtures |
| `pnpm dev:web`                   | web app only                             |
| `pnpm dev:worker`                | worker only                              |

## Checks

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit),
`pnpm test:integration` (needs `DATABASE_URL`), `pnpm build`, and
`pnpm test:e2e` (Playwright, uses your installed Chrome; starts `pnpm dev`
if nothing is running, or set `E2E_BASE_URL`). Visual QA screenshots:
`SHOTS_DIR=/some/dir pnpm test:e2e shots`.

## Environment

`DATABASE_URL`, `DATA_MODE` (`recorded` only), `AUTH_MODE` (`development`; refused in production), `INGESTION_LIVE_SOURCES`
(must stay `false`), `AI_ENABLED` (`false`), `LOG_LEVEL`, `GITHUB_TOKEN`
(unused for now). Validated by `loadEnv` in `packages/shared`.

## Layout

```
apps/web          Next.js UI (app/, components/, features/, lib/, styles/) and Route Handlers (app/api/v1)
apps/worker       background worker (pg-boss)
packages/database schema migrations, client, read-only queries
packages/shared   env, logger, errors, contact-data guard, metrics, AI budget guard
services/providers        source providers, sanitizers, registry
services/ingestion        pipeline, sync state, seed CLI
services/entity-resolution term normalization, GitHub URL parsing, entity resolution
fixtures/         recorded, sanitized snapshots (gsoc, lfx, cncf) + ATTRIBUTION.md
tests/e2e         Playwright tests
scripts/          dev.mjs
docs/             product, architecture, data, security and design documents
```

Frontend code never writes SQL: pages call `packages/database` queries.

## Data rules

Fixtures are recorded, sanitized snapshots of real public data (or clearly
labeled test input). Contact data (emails, LFIDs) must never enter the
repository, database, logs or UI. Descriptions have HTML stripped.

## Troubleshooting

- `role "osx" does not exist`: another Postgres owns the port; this project uses 5433.
- `pnpm dev` says Docker failed: start Docker Desktop and retry.
- pnpm ignoring build scripts: `pnpm approve-builds esbuild`.
- Windows shells: avoid single quotes inside shell heredocs.
- The Next.js dev "N" badge and a slow first page load are normal in dev mode.
