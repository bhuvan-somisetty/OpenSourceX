# Decisions

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

## D-003 Undocumented program endpoints behind adapters (2026-09-21)
- Context: GSoC and LFX expose no documented public API (DATA_SOURCES.md).
- Decision: isolate in adapters, store raw snapshots, throttle, review terms
  before production use.
- Trade-offs: breakage risk if endpoints change.

## D-004 No aggregate health score (2026-09-21)
- Decision: show evidence per dimension instead.
- Reason: explainability and trust.

## D-005 No vector database in the MVP (2026-09-21)
- Decision: structured retrieval plus Postgres text search first.
- Reason: no evidence yet that it is needed.
