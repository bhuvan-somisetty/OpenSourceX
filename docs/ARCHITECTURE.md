# Architecture

## Overview
```
Next.js (TypeScript)  --HTTP-->  API (Node/TypeScript, Fastify)
                                     |
                       PostgreSQL <--+--> Job queue (pg-boss, on Postgres)
                                     |
                              Ingestion workers
                                     |
        GSoC archive | LFX Mentorship | GitHub API | org sites
                                     |
                         AI layer (provider-abstracted)
```

## Principles
- One TypeScript monorepo (pnpm workspaces); no microservices until a
  measured need exists (see DECISIONS.md D-001, D-002).
- Postgres is the source of truth, including the job queue for the MVP
  (avoids running Redis).
- Raw source responses are stored as immutable snapshots; normalized facts
  are derived from them and carry provenance.
- The AI layer only sees retrieved, attributed context and returns validated
  structured output.

## Components
| Component | Responsibility |
|-----------|----------------|
| `apps/web` | UI, server rendering, accessible components |
| `apps/api` | REST API, validation, auth (later), rate limiting |
| `services/ingestion` | Source adapters, snapshots, normalization, scheduling |
| `services/intelligence` | Activity evidence, matching, freshness, learning paths |
| `services/ai` | Retrieval, prompt assembly, validation, provider adapters |
| `packages/shared` | Types, schemas (zod), provenance helpers |

## Data flow (ingestion)
Scheduler -> job -> adapter fetch (rate limited, ETag/If-Modified) ->
raw snapshot stored -> normalize -> upsert entities + facts with provenance ->
conflict detection -> freshness update.

## Scaling notes
Read-heavy; cache popular pages; ingestion is batch and throttled by source
limits, not by our compute. Revisit queue/search choices in P2.
