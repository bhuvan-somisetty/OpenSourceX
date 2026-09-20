# Data Sources

Every source OpenSourceX ingests, how authoritative it is, and how it is
actually accessed. Findings below were verified by direct HTTP requests on
2026-09-21 unless marked **Unverified**.

## Source hierarchy

| Tier | Meaning | Examples |
|------|---------|----------|
| 1 | Official program source | GSoC archive, LFX Mentorship |
| 2 | Official organization/project source | Org websites, ideas pages |
| 3 | Official GitHub data | GitHub REST/GraphQL API |
| 4 | Reliable secondary source | Curated third-party archives |
| 5 | Community/other | Forums, blogs |

A lower-tier source never overrides a higher-tier one. Disagreements are
stored as `CONFLICTING` and shown to the user (see DATA_PROVENANCE.md).

## 1. Google Summer of Code archive

- **URL:** https://summerofcode.withgoogle.com/archive
- **Authority:** Tier 1
- **Access:** The site is a JavaScript app. It serves JSON at
  `https://summerofcode.withgoogle.com/api/program/{year}/organizations/`.
  Verified responses: 2023 (168 orgs), 2024 (194), 2025 (185), 2026 (183).
- **Fields (2025):** name, slug, logo_url, website_url, tagline, license,
  categories, description, tech_tags, topic_tags, source_code,
  contributor_guidance_url, ideas_link, contact_links,
  direct_comm_methods, social_comm_methods.
- **Official API?** **No.** This is an undocumented endpoint used by the
  site's own front end. It may change or be restricted without notice.
- **Terms:** **Unverified.** ToS/robots review is required before any
  production crawl (`/robots.txt` returns 404). Ingest politely: low rate,
  cached, identifiable User-Agent, snapshot raw responses.
- **Years before 2023:** **Unverified.**
- **Not available here:** mentor names, per-project/contributor data were not
  confirmed in this endpoint. Do not claim mentor history until verified.

## 2. LFX Mentorship

- **URL:** https://mentorship.lfx.dev/ (docs: https://docs.linuxfoundation.org/lfx/)
- **Authority:** Tier 1
- **Access:** `https://api.mentorship.lfx.linuxfoundation.org/projects`
  returns paginated JSON (`projects[]`, `nextPageKey`; `pageSize` accepted).
- **Fields:** projectId, name, status, industry, description, repoLink,
  programTerms, createdOn, menteeStatus, acceptApplications, codeOfConduct,
  completedTaskCount, totalTaskCount, lfid, slug.
- **Official API?** Not documented as a public API in what was reviewed.
  Treat as undocumented; same caveats as GSoC.
- **Terms:** **Unverified.**
- **Historical coverage:** Each project carries `programTerms[]` with `name`
  (e.g. "Summer", "Summer PT"), `startDateTime`, `endDateTime`,
  `applicationStartDate`, `applicationEndDate` (Unix seconds), `active`
  (e.g. "closed"). Verified 2026-09-21: terms back to at least 2020. This
  enables term-level history, but term names are not normalized, so the
  ingester must map them to canonical terms by date.
- **Data quality:** `repoLink` is sometimes an organization URL (e.g.
  `github.com/openmainframeproject-internship`) or a legacy repo, not a
  single current repository. Resolve and verify via GitHub before linking.
- **Public statement:** LFX says 190+ mentees accepted since 2019 across 96
  programs (lfx.linuxfoundation.org/tools/mentorship, fetched 2026-09-21).

## 3. GitHub

- **Docs:** https://docs.github.com/en/rest
- **Authority:** Tier 3 (authoritative for repository facts, not for
  program participation or "official" roles).
- **Rate limits (from GitHub docs):** unauthenticated 60 req/h per IP;
  authenticated 5,000 req/h; secondary limits (100 concurrent requests,
  900 points/min REST). Respect `retry-after`; use conditional requests
  (ETag) and cache.
- **Strategy:** authenticated GitHub App/token, REST for metadata, GraphQL
  for bulk reads, ETag caching, backoff on 403/429.
- **Role caution:** activity does not imply maintainer or mentor status.

## Not yet researched

Organization/project websites (Tier 2), CNCF/other mentorship programs,
Outreachy, Hacktoberfest. Listed in OPEN_QUESTIONS.md when created.
