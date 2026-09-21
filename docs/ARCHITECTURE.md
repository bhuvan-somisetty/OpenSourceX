# Architecture

## MVP architecture (D-009)

```
Next.js application (TypeScript)
   |- UI (server and client components)
   '- Route Handlers: modular API layer (/api/v1)
            |
        PostgreSQL  <---- Background worker (Node/TypeScript)
                              |- ingestion and synchronization
                              |- repository analysis
                              |- indexing (and embeddings, only if justified)
                              '- job queue (pg-boss, on Postgres)
                              |
     Providers: GSoC archive | LFX API | CNCF mentoring | GitHub
                              |
                  AI layer (provider-abstracted, validated output)
```

There is **no separate API service** in the MVP. The API is a modular layer
of Route Handlers over a framework-independent domain and data package, so a
standalone service can be introduced later without rewriting the product
(section 3). Any NestJS or other service is added only when implementation
evidence shows a real need (deployment or scaling isolation, non-web
clients, team boundaries).

## 1. Principles

- One TypeScript monorepo (pnpm workspaces); no microservices (D-001).
- Postgres is the source of truth and the job queue for the MVP (D-002).
- Hybrid typed schema with provenance as a first-class concern (D-008).
- Raw source data is sanitized before persistence; personal contact data is
  never stored (DATA_POLICY.md).
- Ingestion is permission-gated per provider (DATA_POLICY.md section 2).
- AI sees only retrieved, attributed, sanitized context (AI_ARCHITECTURE.md).

## 2. Modules

| Module               | Responsibility                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | Next.js UI and Route Handlers that only validate, call the domain layer and shape responses                             |
| `apps/worker`        | Long-running process: scheduler, queue consumers, sync runs                                                             |
| `packages/domain`    | Business logic: activity evidence, matching, freshness, learning paths, resolution rules; no HTTP, no framework imports |
| `packages/db`        | Schema, migrations, typed queries, repositories                                                                         |
| `packages/providers` | One module per source provider (fetch, sanitize, parse)                                                                 |
| `packages/ai`        | Retrieval, prompt assembly, validation, provider adapters                                                               |
| `packages/shared`    | Types, zod schemas, provenance helpers, error types                                                                     |
| `packages/ui`        | Design-system components                                                                                                |

## 3. Keeping a future API service possible

- Route Handlers contain no business logic; they call `packages/domain`.
- The API contract is defined once (zod schemas and OpenAPI generated from
  them) in `packages/shared`.
- `packages/domain` and `packages/db` have no dependency on Next.js.
- The web app calls the domain layer through a thin client interface.
  Swapping it for HTTP to a new service changes one adapter.

## 4. What the worker does

Ingestion and sync (INGESTION_PIPELINE.md), repository analysis triggered
by `POST /repositories/analyze`, freshness updates, search indexing, and
embeddings only if D-005 is revisited. The web process never runs long
jobs.

## 5. Data flow

See INGESTION_PIPELINE.md for the full pipeline: source -> discover -> fetch
-> validate -> sanitize -> normalize -> resolve entities -> deduplicate ->
compare -> persist -> record provenance -> update freshness -> expose.

## 6. Provider boundary

LFX Mentorship contains ecosystems; the CNCF mentoring repository is one
provider covering CNCF projects only (INGESTION_PIPELINE.md section 4).
Core code depends on the provider interface, never on a specific source.

## 7. Scaling notes

Read-heavy: cache pages and API responses by freshness TTL. Ingestion is
limited by source budgets, not our compute. Revisit queue, search and the
API split with measurements, not assumptions.

## 8. Deployment shape

Two deployables: the Next.js app and the worker, plus managed Postgres.
See DEPLOYMENT.md. Note: a serverless web host cannot run the worker; the
worker needs a long-running container or equivalent.
