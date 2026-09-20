# API Specification (v1, draft)

Base: `/api/v1`, implemented as Next.js Route Handlers over the domain layer (D-009). JSON. Errors use RFC 9457 problem+json. Every fact-bearing
response includes a `provenance` object: `{status, tier, source_url,
last_verified_at}`. Lists are cursor-paginated (`cursor`, `limit`).

## Programs
- `GET /programs` - programs (GSoC, LFX Mentorship).
- `GET /programs/{slug}` - detail.
- `GET /programs/{slug}/years/{year}/organizations` - participants.
- `GET /programs/{slug}/history` - participation grid. Each cell carries
  `granularity` (`organization_year`, `project_year`, `project_term`) and
  provenance; GSoC cells are `organization_year`.
- `GET /programs/{slug}/ecosystems` - ecosystems and their coverage (e.g.
  LFX > CNCF, "CNCF projects only").

## Projects
- `GET /projects?q=&language=&tech=&program=&year=` - search/filter.
- `GET /projects/{id}`
- `GET /projects/{id}/program-history`
- `GET /projects/{id}/activity`
- `GET /projects/{id}/community`
- `GET /projects/{id}/learning-path`

## Repositories
- `POST /repositories/analyze` body `{url}`; only `https://github.com/{owner}/{repo}`; returns 202 with job id or 200 if cached.
- `GET /repositories/{id}` `/activity` `/contributors` `/contribution-guide`

## Recommendations (P2 for personalization)
- `POST /recommendations` body `{languages[], technologies[], programs[]}`
  returns items each with `reasons[]` (each reason has a source).

## Interviews
- `POST /interviews` body `{projectId, focus[]}`
- `GET /interviews/{id}`
- `POST /interviews/{id}/answer` body `{questionId, answer}` (length capped)

## Meta
- `GET /health`, `GET /sources` (registry, tiers, ingestion status,
  freshness, licence and attribution text).

## Limits
Per-IP rate limits, body size caps, URL allow-list for analyze.

## Privacy
No endpoint returns emails, LFIDs or other contact data; the schema does not
store them (DATA_POLICY.md). Person objects contain `display_name`,
`github_login` and roles only.
