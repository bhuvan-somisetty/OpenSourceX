# Current Status

Truthful state as of 2026-09-21. Run locally with `pnpm dev`
(http://localhost:3000). Everything below runs on **recorded, sanitized
snapshots**, not live data.

## Implemented (working, tested)

- Monorepo, CI (lint, typecheck, unit, integration, build, audit), Postgres migrations (4).
- Web app (Next.js) with real navigation, dark and light themes, responsive layout verified at 320, 360, 390, 768, 1024 and 1280px, mobile menu.
- Pages: `/` (home), `/discover` (filters, match criteria), `/programs`, `/programs/[id]`, `/projects/[id]`, `/repositories/analyze`, `/interview`, `/sources`; error, loading and not-found states.
- API (Route Handlers): `GET /api/v1/health`, `/programs`, `/projects`, `/projects/[id]`.
- Data-access layer (`packages/database`) so UI never writes SQL.
- Status vocabulary (confirmed, historical, recorded, development, inferred, unknown, stale, conflicting, forecast, placeholder) and source badges/panels on every data view.
- Sanitizing ingestion of recorded fixtures with provenance, term normalization, entity linking, sync state, circuit breaker, schema-drift quarantine, freshness view; contact-data protection.
- Worker process (heartbeat only; live ingestion off).
- Tests: 74 unit, 17 integration, E2E (Playwright: home, discovery, program detail, project detail, desktop and mobile navigation, source status, dev-data labeling, analysis, interview, health, not-found, responsive at 6 widths).

## Partially implemented

- **Discovery:** filters by program, technology and topic over 6 recorded records. "Experience" is disabled: the sources have no such field.
- **Repository analysis:** validates and parses a GitHub URL (never fetches it) and looks it up in the recorded sample. No repository intelligence.
- **Interview:** three questions per project with deterministic development feedback (recorded facts and which technologies you mentioned). Not an evaluation.
- **Project detail:** history, technologies, mentors, sources are real recorded data; contribution guidance and activity are not available.

## Fixture-based data (what is visible)

3 GSoC 2025 organizations (organization/year level), 3 LFX Mentorship
projects for 2026 Term 3 that are CNCF-listed (with 5 mentors' name, public
GitHub handle and role), 1 canonical term. Recorded 2026-09-21. Not
complete coverage.

## Disabled

Live GSoC, LFX, CNCF and GitHub fetching; scheduled ingestion; production
persistence; GitHub analysis; AI (`AI_ENABLED=false`, no provider); saved
items, accounts.

## Blocked

- Live LFX API: **blocked** (Acceptable Use Policy prohibits data mining and robots).
- Live GSoC: **pending** (program terms unread; permission needed).
- CNCF and GitHub: **conditional** on owner approval. See SOURCE_PERMISSIONS.md.
- Any live mode: refused in code until permissions are approved.

## Planned

M1b live ingestion (after approval), GitHub intelligence, activity evidence,
contribution guidance, learning paths, real interview evaluation (needs LLM
approval, Q26), project timeline, forecasts, accounts, E2E in CI.

## Known issues

- Unknown project URLs show the not-found page with HTTP 200 (streaming commits the status early).
- The web app has no per-route CSP yet; the dev server's "N" badge and slow first compile are dev-mode only.
- E2E is run locally; it is not wired into CI yet.
- Fonts use the system stack (Inter if installed); no web font is bundled.
- Sample data is small; discovery results and the term ribbon are sparse by design.
