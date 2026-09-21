# Data Model

PostgreSQL. **Hybrid model (D-008):** strongly typed relational tables for
every core entity, dedicated source and provenance tables, real foreign keys
and check constraints, and flexible JSON only where justified (section 7).
There is deliberately **no generic fact table** as the primary model.

## 1. Overview

```
source_provider -< source_dataset -< source_snapshot -< provenance_record
                                                             ^ (every typed row points here)
program -< program_year -< program_term -< term_alias
program -< program_ecosystem

organization -< project -< repository -< issue, pull_request, commit, release
organization -< organization_alias      project -< project_alias
repository  -< repository_name_history  repository >-< language
project     >-< technology

participation  (typed FKs, see 3)
mentorship_project -< mentorship_project_term      (LFX offerings, see 4)
project_idea                                       (proposals, NOT participation)

person -< person_role
community_channel
external_identifier, entity_link (resolution), entity_revision, conflict
sync_run, sync_cursor, freshness_policy
forecast (P3)   app_user, user_skill (P3)
interview_session -< interview_question -< interview_answer
```

## 2. Programs, ecosystems and terms

- `program(id, slug, name, official_url)`: LFX Mentorship, Google Summer of
  Code.
- `program_ecosystem(id, program_id, key, name, coverage_note)`: e.g.
  LFX -> `cncf`. Models "CNCF is one ecosystem inside LFX, not all of it".
- `program_year(id, program_id, year, phase, milestones_provenance_id)`.
- `program_term(id, program_id, year, term_code, track, starts_on, ends_on,
derived_status, canonical_label)`; unique
  `(program_id, year, term_code, track)`. `derived_status` (upcoming,
  in_progress, completed) is computed from dates only.
- `term_alias(id, program_id, raw_text_normalized, source_dataset_id,
program_term_id, method, confidence_level, reviewed_by, reviewed_at)`.
  The original text is always kept.

## 3. Participation and its granularity (resolves Q8, D-007)

`participation(id, program_year_id NOT NULL, program_term_id NULL,
organization_id NULL, project_id NULL, mentorship_project_id NULL,
granularity, status, provenance_id NOT NULL)` where `granularity` is one of
`organization_year`, `project_year`, `project_term`.

Check constraints enforce the grain:

- `organization_year`: `organization_id` set; `project_id` and
  `program_term_id` null. **This is the only shape GSoC data supports.**
- `project_term`: `project_id` and `program_term_id` set (LFX, and CNCF LFX).
- `project_year`: `project_id` set, only if a source verifies it.

The UI copy follows the grain (UI_UX_SPECIFICATION section 6): "Organization
participated in GSoC 2025". A project-level GSoC claim exists only if a row
of grain `project_year` with its own authoritative provenance exists;
otherwise the UI says "Project-level GSoC participation: not verified".

## 4. LFX mentorship projects vs OpenSourceX projects

- `mentorship_project(id, lfx_project_uuid UNIQUE, title, program_id,
ecosystem_id NULL, project_id NULL, repository_id NULL, raw_repo_link,
link_state, description_excerpt)`: an LFX offering. `project_id` and
  `repository_id` come from entity resolution and may be null.
- `mentorship_project_term(mentorship_project_id, program_term_id,
raw_term_name, source_start, source_end)`.
- `project_idea(id, program_id, ecosystem_id, program_year_id NULL,
program_term_id NULL, project_id NULL, title, excerpt, source_url,
provenance_id)`: a _proposed_ idea (e.g. CNCF's `summerofcode/{year}.md`).
  Ideas are evidence of interest, never proof of participation.

## 5. Core entities

- `organization(id, slug, name, website_url, github_org_id NULL,
first_seen, provenance_id)`; `organization_alias(organization_id, alias,
kind, source, valid_from, valid_to)`.
- `project(id, organization_id, slug, name, summary_excerpt, provenance_id)`;
  `project_alias`.
- `repository(id, project_id NULL, github_repo_id UNIQUE, github_node_id,
full_name, url, default_branch, archived, is_fork, license_spdx,
description_excerpt, provenance_id)`;
  `repository_name_history(repository_id, full_name, valid_from, valid_to)`.
- `language(id, name)`; `repository_language(repository_id, language_id,
bytes, observed_at, provenance_id)`.
- `technology(id, slug, name, kind)` with `technology_alias`;
  `project_technology(project_id, technology_id, provenance_id, status)`.
- `person(id, display_name NULL, github_user_id NULL UNIQUE, github_login
NULL)`. **No email, LFID, phone or contact column exists or may be added**
  (DATA_POLICY section 3; enforced by a schema test).
- `person_role(id, person_id, role, organization_id NULL, project_id NULL,
repository_id NULL, program_term_id NULL, status, provenance_id)`;
  `role` in `contributor | reviewer | merger | maintainer | official_mentor`;
  check: exactly one scope column is set. `maintainer` and
  `official_mentor` may only be created from a source that asserts them
  (e.g. CNCF term README/export for `official_mentor` of a named term).
- `community_channel(id, organization_id NULL, project_id NULL, kind, url,
handle, provenance_id)`; check: exactly one owner. Kinds include chat,
  mailing list, forum, social, docs, ideas page, discussions.
- `issue(id, repository_id, number, state, title, labels text[],
created_at, closed_at, author_person_id NULL, url, provenance_id)`.
- `pull_request(id, repository_id, number, state, merged, title,
created_at, merged_at, closed_at, author_person_id NULL,
merged_by_person_id NULL, linked_issue_number NULL, url, provenance_id)`.
  MVP stores metadata for counts and recency; deep analysis tables
  (changed files, reviews) are added in Phase 2.
- `commit(id, repository_id, sha, committed_at, author_person_id NULL)`; no
  author email or name is stored.
- `release(id, repository_id, tag, published_at, url, provenance_id)`.
- `activity_snapshot(id, repository_id, window_days, commits, prs_opened,
prs_merged, issues_opened, issues_closed, releases, distinct_contributors,
computed_at, provenance_id)`: the evidence behind activity labels.

## 6. Source, provenance and integrity

- `source_provider(id, key, name, tier, program_id NULL, ecosystem_id NULL,
coverage, base_url, licence_note, terms_status, robots_status,
ingestion_status)`: mirrors the DATA_POLICY register.
- `source_dataset(id, provider_id, key, description, parser_version,
cadence, rate_budget)`.
- `source_snapshot(id, dataset_id, url, fetched_at, http_status, etag,
content_hash, schema_version, sanitized_body_ref, retention_until)`.
  **Only sanitized projections are stored; raw bodies of email-bearing
  files are never persisted.**
- `provenance_record(id, snapshot_id, source_dataset_id, source_url,
source_type, publisher, observed_at, published_at, last_verified_at,
valid_from, valid_until, status, confidence_level, confidence_reason,
derivation, rule_id)`; see DATA_PROVENANCE.md. Every typed row that
  carries a claim has a non-null `provenance_id`.
- `external_identifier(entity_type, entity_id, dataset_id, id_type, value,
valid_from, valid_to)`: source-specific ids (LFX UUID, GSoC org slug,
  CNCF slug, GitHub ids). Uniqueness per `(dataset_id, id_type, value)`.
- `entity_link(id, left_type, left_id, right_type, right_id, state, method,
evidence, confidence_level, reviewed_by)`: resolution results
  (ENTITY_RESOLUTION.md); overrides are rows here.
- `entity_revision(id, entity_type, entity_id, changed_fields jsonb,
provenance_id, observed_at)`: append-only history of attribute changes.
- `conflict(id, entity_type, entity_id, attribute, provenance_a,
provenance_b, status, resolved_by, resolved_at)`.
- `sync_run(id, dataset_id, started_at, finished_at, status, counts jsonb,
error)`; `sync_cursor(dataset_id, cursor, updated_at)`;
  `freshness_policy(dataset_id, entity_kind, max_age)`.

**Integrity rules:** foreign keys everywhere; typed enums; check
constraints for grain and single-owner scopes; unique keys on stable ids;
history is append-only (`valid_from/valid_to` or revisions), never
overwritten; a claim without provenance is rejected at insert.

## 7. Where flexible JSON is allowed

`sync_run.counts`, `entity_revision.changed_fields`, and sanitized
projections referenced by `source_snapshot`. Nothing queried by product
features lives in JSON. Any new JSON column needs a DECISIONS entry.

## 8. Freshness and status

`provenance_record.status` stores CONFIRMED, HISTORICAL, INFERRED,
FORECAST, UNKNOWN, CONFLICTING. **STALE is derived at read time** from
`last_verified_at` and `freshness_policy`, so it can never be forgotten.

## 9. Forecast (P3)

`forecast(id, program_id, organization_id NULL, project_id NULL,
target_year, method, inputs_ref, label, confidence_level, generated_at,
expires_at, provenance_id)`; status is always FORECAST. See FORECASTING.md.

## 10. Users and interviews

- MVP: `interview_session(id, token_hash, project_id, created_at,
expires_at)`, `interview_question(id, session_id, category, text,
evidence_ids)`, `interview_answer(id, question_id, answer_text,
evaluation, evaluated_at)`; anonymous, expiring.
- P3: `app_user`, `user_skill`, saved items and workspace tables.

## 11. Representation check

| Need                           | Represented by                                                            |
| ------------------------------ | ------------------------------------------------------------------------- |
| GSoC org per year              | `participation` grain `organization_year`                                 |
| LFX term-level history         | `program_term`, `mentorship_project_term`, `participation` `project_term` |
| Term aliases and raw names     | `term_alias`, `mentorship_project_term.raw_term_name`                     |
| CNCF as one LFX ecosystem      | `program_ecosystem`, `source_provider.ecosystem_id`, coverage             |
| Organizations, projects, repos | typed tables, aliases, name history                                       |
| People and roles               | `person`, `person_role` (no contact data)                                 |
| Sources, provenance, freshness | source tables, `provenance_record`, `freshness_policy`                    |
| Conflicts                      | `conflict`                                                                |
| Forecasts                      | `forecast`                                                                |
| Historical preservation        | append-only revisions, validity ranges                                    |
