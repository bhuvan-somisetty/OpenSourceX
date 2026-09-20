# Source probes, 2026-09-21

Direct HTTP requests made to confirm what the sources actually expose.
Nothing here is assumed; anything not listed was not tested.

## GSoC (summerofcode.withgoogle.com)
| Request | Result |
|---------|--------|
| `/api/program/{year}/organizations/` 2022 | 200, 198 organizations |
| same, 2023 / 2024 / 2025 / 2026 | 200; 168 / 194 / 185 / 183 organizations |
| same, 2016-2021 | 404 |
| `/api/program/2025/` | 200; program metadata: `is_active`, `phase` (e.g. `program_archived`), `milestones[]` (org application start/deadline, notification, announce dates), terms versions |
| `/api/program/2025/projects/` | **403 Forbidden** |
| `/api/program/2025/organizations/{slug}/` | 404 |
| `/robots.txt` | 404 |
| `/terms`, `/rules` | 200 but the page is a JS app; text not readable by our fetch, so no terms were reviewed |

Organization record keys (2025): name, slug, logo_url, website_url, tagline,
license, categories, description, tech_tags, topic_tags, source_code,
contributor_guidance_url, ideas_link, contact_links, direct_comm_methods,
social_comm_methods. There are no mentor, person or project fields.

## LFX Mentorship
**Correction:** the first version of this file said 720 projects. That crawl
was stopped by a page cap in my script. The uncapped crawl follows.

| Request | Result |
|---------|--------|
| `api.mentorship.lfx.linuxfoundation.org/projects` (paginated via `nextPageKey`) | 200; **1,301 projects across 145 pages**, ended without a next key; all `status: Published` |
| `mentorship.lfx.dev/robots.txt` | 200: `User-agent: * / Disallow: /` |
| `api.mentorship.lfx.linuxfoundation.org/robots.txt` | 404 |

- 1,294 projects have `programTerms`; 7 have none.
- 151 distinct term-name spellings, e.g. "Term 3: Sep-Nov" (120),
  "Term 1 Mar-May" (92), "2026 Term 1: March - May" (72), "01-Mar-May",
  "Summer PT/FT", "Spring'2022".
- Term start years: 2020 (118), 2021 (176), 2022 (188), 2023 (225),
  2024 (205), 2025 (262), 2026 (270), 2027 (1).
- `repoLink`: 1,162 GitHub repository URLs, 78 GitHub organization URLs,
  61 other or empty.

## CNCF mentoring repository (github.com/cncf/mentoring)
- Repo metadata: public, Apache-2.0, default branch `main`, last push
  2026-09-14. Content licence file `LICENSE-CONTENT` is CC BY 4.0.
- `programs/lfx-mentorship/` has folders 2019-2027, each with terms such as
  `01-Mar-May`, `02-Jun-Aug`, `03-Sep-Nov`.
- 2026/03-Sep-Nov contains `README.md`, `lfx-export.json` (59 programs),
  `lfx-tracking.csv`, `project_ideas.md`. 2025 terms and 2026/01 contain
  README (and project_ideas) only.
- Export keys: cncf_project, cncf_project_maturity, cncf_project_slug,
  description, issue_number, issue_url, lfx_url, mentors, prerequisites,
  program_name_full, program_name_short, skills, technologies, term,
  upstream_issue_url.
- `lfx-tracking.csv` columns include mentor **email address** and **LFID**.
  Must not be ingested.
- UUID join: 59 LFX URLs in the export; 33 matched an LFX API `projectId`.
- The 2026 Term 3 README says "Status: Planning" although the term started
  Sep 7 2026, so the text is stale.

## Not tested
GSoC or LFX terms of use text, GSoC 2016-2021 via other paths, why 26 of 59
CNCF 2026 Term 3 projects are absent from the LFX API, mentor data for GSoC
or for non-CNCF LFX projects, older CNCF terms' file formats, rate limits of
either endpoint, and slug stability across GSoC years.
