# API Specification (v1, draft)

Base: `/api/v1`. JSON. Errors use RFC 9457 problem+json. Every fact-bearing
response includes a `provenance` object: `{status, tier, source_url,
last_verified_at}`. Lists are cursor-paginated (`cursor`, `limit`).

## Programs
- `GET /programs` - programs (GSoC, LFX Mentorship).
- `GET /programs/{slug}` - detail.
- `GET /programs/{slug}/years/{year}/organizations` - participants.
- `GET /programs/{slug}/history` - year/term participation grid.

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
- `GET /health`, `GET /sources` (registry, tiers, freshness).

## Limits
Per-IP rate limits, body size caps, URL allow-list for analyze.
