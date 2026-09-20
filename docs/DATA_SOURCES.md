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
  Verified responses: 2022 (198 orgs), 2023 (168), 2024 (194), 2025 (185), 2026 (183).
  A program metadata endpoint `/api/program/{year}/` also exists (phase and
  milestone dates). Details: RESEARCH/2026-09-21-source-probes.md.
- **Fields (2025):** name, slug, logo_url, website_url, tagline, license,
  categories, description, tech_tags, topic_tags, source_code,
  contributor_guidance_url, ideas_link, contact_links,
  direct_comm_methods, social_comm_methods.
- **Official API?** **No.** This is an undocumented endpoint used by the
  site's own front end. It may change or be restricted without notice.
- **Terms:** **Unverified.** ToS/robots review is required before any
  production crawl (`/robots.txt` returns 404). Ingest politely: low rate,
  cached, identifiable User-Agent, snapshot raw responses.
- **Years before 2022:** 2016-2021 return 404 at this path; coverage before
  2022 is unavailable here (other paths untested).
- **Grain:** data is **organization per year**. The `/projects/` endpoint
  returns 403 and the organization record has no mentor, person or project
  fields. GSoC project-level and mentor history are therefore **not
  available** from this source; do not claim them.

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
- **Terms:** **Unverified.** `mentorship.lfx.dev/robots.txt` disallows all
  crawlers (`Disallow: /`); the API host has no robots file. Treat as a
  compliance blocker for production ingestion until permission or terms are
  confirmed (OPEN_QUESTIONS Q2).
- **Coverage:** 1,301 published projects visible (complete crawl, 145 pages);
  unpublished projects are not exposed. 26 of the 59 projects in the CNCF
  2026 Term 3 export were not in the API, so it lags real programs.
- **Historical coverage:** Each project carries `programTerms[]` with `name`
  (e.g. "Summer", "Summer PT"), `startDateTime`, `endDateTime`,
  `applicationStartDate`, `applicationEndDate` (Unix seconds), `active`
  (e.g. "closed"). Verified 2026-09-21: 151 distinct term-name spellings, terms starting
  2020 through 2027 (one future term). This
  enables term-level history, but term names are not normalized, so the
  ingester must map them to canonical terms by date.
- **Data quality:** of 1,301 projects, 1,162 `repoLink`s are GitHub repository
  URLs, 78 are GitHub organization URLs and 61 are other or empty. Resolve and verify via GitHub before linking.
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

## 4. CNCF mentoring repository (LFX Mentorship for CNCF projects)

- **URL:** https://github.com/cncf/mentoring, path
  `programs/lfx-mentorship/{year}/{term}/`
- **Authority:** Tier 2 (official CNCF program repository) for CNCF
  projects only. It does not cover other Linux Foundation projects.
- **Data:** per-term `README.md` (timeline, status, selected projects with
  mentors, LFX URL), `project_ideas.md`, and for at least 2026 Term 3 a
  machine-readable `lfx-export.json` (59 programs: cncf_project, maturity,
  description, technologies, skills, mentors with GitHub handles, LFX URL,
  upstream issue URL) and `lfx-tracking.csv`. Year folders exist for 2019 to
  2027; export files are not present for every term (2025 terms have README
  only; 2026 Term 1 has README only).
- **Access:** GitHub REST API or raw files; no scraping needed.
- **Licensing:** repository is Apache-2.0; `LICENSE-CONTENT` is Creative
  Commons Attribution 4.0. Reuse is allowed **with attribution**.
- **Join key:** each project has an LFX URL containing the LFX project UUID,
  which equals `projectId` in the LFX API (33 of 59 matched in the 2026
  Term 3 export; the rest are not yet in the API).
- **Personal data warning:** `lfx-tracking.csv` contains mentor **email
  addresses and LFIDs**. OpenSourceX must never ingest those columns. Use
  only name and GitHub handle, and only where published for mentoring.
- **Reliability caveat:** a README can be stale. 2026 Term 3 still says
  "Status: Planning" although its dates (start Sep 7) have passed. Derive
  status from dates, not from that text.
- **Mentor data:** this is the first verified source of official mentor
  names per term for CNCF projects. It does not exist for GSoC.

## Not yet researched

Organization/project websites (Tier 2), CNCF/other mentorship programs,
Outreachy, Hacktoberfest. Listed in OPEN_QUESTIONS.md when created.
