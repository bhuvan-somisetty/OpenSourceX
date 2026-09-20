# Data Model

PostgreSQL. All time-sensitive facts link to provenance (DATA_PROVENANCE.md).

## Core entities
```
Program 1--* ProgramYear 1--* ProgramTerm
Organization 1--* Project 1--* Repository
Participation: (Project|Organization) x (ProgramYear|ProgramTerm)
Repository 1--* Issue, PullRequest, Commit(summary), ReleaseRecord
Person 1--* PersonRole (scoped to Repository/Organization/Program)
Project *--* Technology; Repository *--* Language
Project 1--* CommunityChannel
Source 1--* Snapshot 1--* Fact
User 1--* UserSkill, InterviewSession 1--* InterviewQuestion
Forecast (P3) -> Project, Program
```

## Key tables (MVP)
- `program(id, slug, name, publisher_url)`
- `program_year(id, program_id, year)`; `program_term(id, program_id, year,
  label, starts_at, ends_at, raw_name)`
- `organization(id, slug, name, website_url)`
- `project(id, org_id, slug, name, summary)`
- `repository(id, project_id, github_id, full_name, url, default_branch,
  archived, verified_at)`
- `participation(id, subject_type, subject_id, program_year_id,
  program_term_id, source_fact_id)`
- `person_role(id, person_id, scope_type, scope_id, role, source_fact_id)`
  where role in contributor|reviewer|merger|maintainer|official_mentor and
  only role-asserting sources may create maintainer/official_mentor.
- `source(id, key, name, tier, base_url)`
- `snapshot(id, source_id, url, fetched_at, http_status, etag, body_hash,
  body_json)`
- `fact(id, subject_type, subject_id, predicate, value_json, status,
  confidence, snapshot_id, observed_at, published_at, last_verified_at,
  valid_from, valid_until)`
- `interview_session`, `interview_question`, `interview_answer` (P2 adds
  user ownership).
User tables are deferred; MVP interview sessions are anonymous with an
unguessable id and short retention.

## Constraints
Unique (program_id, year); unique (github_id); facts are append-only; a
superseding fact sets `valid_until` on the prior one.
