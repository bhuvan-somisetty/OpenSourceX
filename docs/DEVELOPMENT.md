# Development

**Status: the workspace is not scaffolded yet; the commands below are the
plan, not working instructions.**

Prerequisites: Node 24, pnpm, Docker (for Postgres), Git.

Planned setup: `pnpm install`, copy `.env.example` to `.env`,
`docker compose up -d db`, `pnpm db:migrate`, `pnpm dev`.

Environment: `DATABASE_URL`, `GITHUB_TOKEN` (read-only, public data),
optional LLM provider key. Processes: the Next.js app (UI and Route
Handlers) and the worker; there is no separate API service (D-009).
Providers marked `pending` in DATA_POLICY.md must not run against live
sources in shared or production environments.

Commands: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

Fixtures must be labeled `DEVELOPMENT FIXTURE` and never ship to production.
