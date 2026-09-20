# Development

**Status: the workspace is not scaffolded yet; the commands below are the
plan, not working instructions.**

Prerequisites: Node 24, pnpm, Docker (for Postgres), Git.

Planned setup: `pnpm install`, copy `.env.example` to `.env`,
`docker compose up -d db`, `pnpm db:migrate`, `pnpm dev`.

Environment: `DATABASE_URL`, `GITHUB_TOKEN` (read-only, public data),
optional LLM provider key.

Commands: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

Fixtures must be labeled `DEVELOPMENT FIXTURE` and never ship to production.
