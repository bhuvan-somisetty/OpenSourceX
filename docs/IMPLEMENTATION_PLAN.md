# Implementation Plan

Status values: Planned / In progress / Done (verified). Nothing below is
implemented yet.

- **M0 Foundation (Planned):** pnpm workspace with the ARCHITECTURE.md
  module layout, Next.js app, worker skeleton, CI, lint, typecheck,
  Postgres compose, migrations, `.gitattributes`. Done when CI is green.
- **M1 Ingestion (Planned), split:**
  - **M1a** local read-only spike on recorded, sanitized snapshots;
    provider interface; sanitizer with planted-PII tests; term
    normalization and entity-resolution prototypes against real recorded
    data. No live production crawling.
  - **M1b** real schema (DATA_MODEL.md), provenance, sync pipeline; each
    provider enabled only when `approved` in DATA_POLICY.md.
- **M2 API (Planned):** Route Handlers over the domain layer: programs,
  projects, history (with granularity), sources.
- **M3 GitHub intelligence (Planned):** analyze, activity evidence, basic PR
  metadata, contribution-guide detection; SSRF-safe; quota controls.
- **Design phase (Planned, parallel to M1):** concrete tokens, wireframes,
  visual direction, owner approval before M4 (H-6).
- **M4 Web (Planned):** landing, discover, program, project, analysis, all
  UI states, accessibility checks.
- **M5 Learning + Interview (Planned):** learning levels 1-3, interview mode
  with grounded evaluation and injection tests; LLM spend caps first.
- **M6 Quality pass and audit (Planned).**
- **Phase 2 work** is listed in ROADMAP.md.

Definition of done: tests, lint, typecheck and build pass; docs updated; no
fake data; all UI states implemented; privacy tests pass (no contact data
anywhere); security reviewed.
