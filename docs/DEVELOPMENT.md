# Development

Status: M0 foundation is implemented; M1a spike is in progress. Features are
not built yet (see IMPLEMENTATION_PLAN.md).

## Prerequisites

Node 24, pnpm 12, Docker (for Postgres), Git.

## Setup

```
pnpm install
cp .env.example .env
docker compose up -d --wait db      # Postgres on localhost:5433
export DATABASE_URL=postgres://osx:osx_dev_password@localhost:5433/opensourcex
pnpm db:migrate
pnpm dev                            # Next.js app (UI + Route Handlers)
pnpm dev:worker                     # background worker (pg-boss)
```

Port 5433 avoids clashing with a Postgres already installed on the host.
The dev password in `docker-compose.yml` is for local use only.

## Environment

`DATABASE_URL`, `LOG_LEVEL`, `GITHUB_TOKEN` (optional, read-only, public
data), `INGESTION_LIVE_SOURCES` (keep `false`; GSoC, LFX and CNCF are
`pending` in DATA_POLICY.md). Values are validated by `loadEnv` in
`packages/shared`. There is no separate API service (D-009).

## Checks

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit),
`pnpm test:integration` (needs `DATABASE_URL`), `pnpm build`. CI runs all of
them plus a dependency audit.

## Layout

`apps/web` (UI and Route Handlers), `apps/worker`, `packages/shared`
(env, logger, errors, contact-data guard), `packages/database` (client,
migrations). More packages arrive with M1a (see ARCHITECTURE.md).

## Data rules

Fixtures are either recorded, sanitized snapshots of real public data or
clearly labeled `DEVELOPMENT FIXTURE`; neither ships to production. No
contact data (emails, LFIDs) may enter the repository, database, logs or
tests other than as deliberately planted, labeled test input.

## Troubleshooting

- `role "osx" does not exist`: another Postgres owns the port; use 5433.
- pnpm ignoring build scripts: `pnpm approve-builds esbuild`.
- Windows shells: avoid single quotes inside shell heredocs; write such
  files with an editor.
