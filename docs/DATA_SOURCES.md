# Data Sources

Every source OpenSourceX ingests, how authoritative it is, and how it is
actually accessed. Findings below were verified by direct HTTP requests on
2026-09-21 unless marked **Unverified**.

## Source hierarchy

| Tier | Meaning | Examples |
|------|---------|----------|
| 1 | Official program source | GSoC archive, LFX Mentorship |
| 2 | Official organization, project or ecosystem source | Org websites, CNCF mentoring repository |
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

## 4. CNCF mentoring repository (CNCF ecosystem inside LFX Mentorship)

**Boundary: this is CNCF-specific. It is not the whole LFX Mentorship
ecosystem** (the LFX API listed 1,301 published projects; CNCF's 2026 Term 3
export lists 59). It is one provider under `LFX Mentorship > CNCF ecosystem`
(INGESTION_PIPELINE.md section 4).

- **URL:** https://github.com/cncf/mentoring (default branch `main`, last
  push 2026-09-14 at time of check)
- **Authority:** Tier 2, official ecosystem source, for CNCF projects only.
- **Structure verified 2026-09-21:**
  - `programs/lfx-mentorship/{year}/{term}/` for 2019 to 2027. Folder names
    vary by era: 2019 README only; 2020 `q1`, `q2`, `q3-q4`; 2021
    `01-Spring`, `02-Summer`, `03-Fall`; 2022 `01-Spring`, `02-Summer`,
    `03-Sept-Nov`; 2023 onward `01-Mar-May`, `02-Jun-Aug`, `03-Sep-Nov`.
  - Per term: `README.md` (timeline, status, selected projects and mentors,
    LFX URL) and `project_ideas.md`. Only some terms have machine-readable
    files: **2026 Term 3** has `lfx-export.json` (59 programs) and
    `lfx-tracking.csv`; 2025 terms and 2026 Term 1 have README only.
  - `programs/summerofcode/{2017..2026}.md`: CNCF's GSoC **project ideas**.
    These are proposals, not participation records, and they are not
    project-level GSoC participation evidence (D-007).
  - `programs/outreachy/README.md`, `programs/archive/`.
  - Top-level `mentors/` and `mentees/` contain only a `README.md` guide;
    they are **not rosters**.
- **Export fields (2026 Term 3):** cncf_project, cncf_project_maturity,
  cncf_project_slug, description, issue_number, issue_url, lfx_url,
  mentors, prerequisites, program_name_full, program_name_short, skills,
  technologies, term, upstream_issue_url. Mentor objects carry `name`,
  `github_handle`, `role`, **`email`, `lfid`**.
- **Mentor and project data:** available for CNCF LFX projects; this is the
  first verified source of official mentor names per term. It does not
  exist for GSoC.
- **Join key:** the LFX project UUID inside each `lfx_url` equals the
  `projectId` in the LFX API. Verified for 33 of 59 export projects; the
  other 26 were not in the API at check time, so the API lags or omits
  some programs. Treat as a useful key **where verified**, not a guarantee.
- **Licensing (verified):** GitHub reports the repository licence as
  Apache-2.0 (code). `LICENSE-CONTENT` is the full Creative Commons
  Attribution 4.0 text. Which files each licence covers is not stated in
  the README, so the scope is to be confirmed (DATA_POLICY register).
  Reuse is permitted with attribution: credit CNCF, link the source and the
  licence, indicate changes.
- **Personal data (verified):** contact data appears in `lfx-tracking.csv`
  **and inside `lfx-export.json`** (mentor `email`, `lfid`) **and in
  markdown** (GSoC idea files list mentor emails). Rule: never ingest,
  store, index, embed, log, expose or export it. Use only name, public
  GitHub handle, publicly documented role and project relationship, with
  provenance, via allowlist parsers and never persisting raw bodies
  (DATA_POLICY section 3).
- **Reliability caveat:** status text can be stale. The 2026 Term 3 README
  still says "Status: Planning" although the term began Sep 7 2026. Status
  is derived from dates; the text is recorded as an observation only.
- **Update frequency:** repository is actively maintained; use conditional
  requests and a daily check.
- **Rate limits:** GitHub API limits apply (section 3).
- **Ingestion status:** `pending` until the sanitizer, licence-scope check
  and attribution UI exist (DATA_POLICY).

## Permissions and terms
The per-source terms, robots, licence and attribution status, and the
`approved/pending/blocked` ingestion register, are in DATA_POLICY.md
section 2. **No source is approved for production ingestion yet.**

## Not yet researched
Organization/project websites (Tier 2), other LF ecosystems' providers,
Outreachy data, Hacktoberfest. Tracked in OPEN_QUESTIONS.md.
