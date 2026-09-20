# Data Provenance

Every important fact is a row in `fact` with its origin.

## Fields
`source_id`, `snapshot_id` (raw evidence), `source_url`, `source_type`
(official_program | official_org | github | secondary | community),
`publisher`, `observed_at` (we fetched), `published_at` (source says),
`last_verified_at`, `valid_from`, `valid_until`, `confidence` (0–1, with
reason), `status`.

## Status
| Status | Meaning |
|--------|---------|
| CONFIRMED | Directly stated by a Tier 1–3 source, verified recently |
| HISTORICAL | True for a past period, kept as record |
| INFERRED | Derived by rule/model; rule and inputs listed |
| FORECAST | Prediction; never shown as fact |
| UNKNOWN | No source; UI says so |
| STALE | Past its freshness window; UI says "may be outdated" |
| CONFLICTING | Sources disagree; all values shown with sources |

## Freshness windows (initial, tunable)
Program listings: 7 days in season, 30 otherwise. GitHub activity: 24 hours.
Docs/contribution guides: 14 days.

## Conflict rule
Higher tier wins for the default display only when the difference is
recorded; otherwise show both. Never silently overwrite.

## UI contract
Each fact renders: value, source badge (tier), last verified date, status.
