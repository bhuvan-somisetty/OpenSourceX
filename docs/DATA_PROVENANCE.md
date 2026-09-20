# Data Provenance

Provenance is first-class and relational: every typed row that carries a
claim points to a `provenance_record` (DATA_MODEL.md section 6). This is not
a generic fact table; provenance describes *where and how* a typed value
was learned.

## Fields (`provenance_record`)
`snapshot_id` (sanitized evidence), `source_dataset_id`, `source_url`,
`source_type` (official_program | official_org | official_ecosystem |
github | secondary | community), `publisher`, `observed_at` (we fetched),
`published_at` (source says), `last_verified_at`, `valid_from`,
`valid_until`, `status`, `confidence_level` with `confidence_reason`,
`derivation` (direct | rule | model), `rule_id`.

## Status
| Status | Meaning | Stored or derived |
|--------|---------|-------------------|
| CONFIRMED | Stated by a Tier 1-3 source, recently verified | stored |
| HISTORICAL | True for a past period, kept as record | stored |
| INFERRED | Derived by rule or model; inputs and rule listed | stored |
| FORECAST | Prediction; never shown as fact | stored |
| UNKNOWN | No source; UI says "Not verified" | stored |
| CONFLICTING | Sources disagree; all values shown | stored (`conflict` row) |
| STALE | Past its freshness window; UI says "May be outdated" | **derived at read time** |

## Confidence (single scale, resolves M-4)
`high`: direct statement from a Tier 1-3 source, verified within the
freshness window. `medium`: direct statement from a lower tier, or a
rule-based inference from Tier 1-3 inputs. `low`: corroborated weak signals.
`none`: shown as UNKNOWN. The AI layer uses the same labels. No numeric
score is shown to users.

## Source hierarchy
| Tier | Meaning | Examples |
|------|---------|----------|
| 1 | Official program source | GSoC archive, LFX Mentorship API |
| 2 | Official organization, project or ecosystem source | CNCF mentoring repository (CNCF projects), project websites |
| 3 | Official GitHub data | GitHub API for repository facts |
| 4 | Reliable secondary source | curated third-party archives |
| 5 | Community or other | forums, blogs |

Authority is per claim type: GitHub (Tier 3) is authoritative for
repository facts but not for program participation; the CNCF repository
(Tier 2) is authoritative for CNCF's mentor and project selection but
covers only CNCF.

## Freshness (initial windows, tunable)
Program listings: 7 days in season, 30 otherwise. Ecosystem sources
(CNCF): 7 days. GitHub activity: 24 hours. Docs: 14 days. A failed fetch
never refreshes `last_verified_at`.

## Dates beat prose
Status is derived from dates. Text such as a README "Status: Planning" is
recorded as an observation and never overrides date-derived status; a
disagreement creates a `conflict`.

## Conflicts
Never silently overwrite. Higher tier may drive the default display only
when the disagreement is recorded and visible.

## History
Attribute changes go to `entity_revision`; superseded values keep their
provenance and validity ranges. Do not overwrite historical facts because
current data changed.

## CNCF mentoring provider specifics
- Source type `official_ecosystem`, Tier 2, coverage `ecosystem` (CNCF).
- Provenance `source_url` points to the exact file and commit; attribution
  text (CC BY 4.0) is stored with the dataset.
- Only sanitized fields are recorded; contact data is never present in
  snapshots (DATA_POLICY.md section 3).

## UI contract
Each fact shows: value, source badge with tier, last verified date, status
chip, and, for granularity-sensitive facts, its level ("Organization" or
"Project").
