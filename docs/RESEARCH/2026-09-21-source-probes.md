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
| Request | Result |
|---------|--------|
| `api.mentorship.lfx.linuxfoundation.org/projects` (paginated via `nextPageKey`) | 200; 720 projects across 80 pages, all `status: Published` |
| `mentorship.lfx.dev/robots.txt` | 200: `User-agent: * / Disallow: /` |
| `api.mentorship.lfx.linuxfoundation.org/robots.txt` | 404 |

- 713 projects have `programTerms`; 7 have none.
- 125 distinct term-name spellings, e.g. "Term 3: Sep-Nov", "Term 1 Mar-May",
  "Summer PT", "Summer FT", "2025 Term 3: Sep-Nov", "01-Mar-May",
  "Spring'2022", "2026 Term 3 (Sep-Nov)".
- Term start years: 2020 (83), 2021 (112), 2022 (100), 2023 (139),
  2024 (108), 2025 (141), 2026 (132), 2027 (1).
- `repoLink`: 644 GitHub repository URLs, 34 GitHub organization URLs,
  42 other or empty.

## Not tested
GSoC or LFX terms of use text, GSoC 2016-2021 via other paths, whether the
LFX endpoint hides unpublished or older projects, mentor data anywhere,
rate limits of either endpoint, and slug stability across GSoC years.
