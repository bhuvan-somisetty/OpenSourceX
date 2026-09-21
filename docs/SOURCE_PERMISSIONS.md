# Source Permissions

Decision record for every planned provider. Resolves Q2 and Q18 as far as
published terms allow. Checked on **2026-09-21**. This is a documentation
review, **not legal advice**; items marked for the owner or counsel need a
human decision. Silence in a document is never treated as permission.

Decision values: **APPROVED**, **CONDITIONAL** (basis established, owner
approval still required), **PENDING / REQUIRES PERMISSION**, **BLOCKED**.
The provider registry (`packages/providers/src/registry.ts`) stays
non-approved for every source until the owner records approval here.

Reviewer: prepared for review by the project owner (bhuvan-somisetty). No
owner approval has been recorded yet.

## Summary

| Provider                              | Decision                                                                               | Live ingestion |
| ------------------------------------- | -------------------------------------------------------------------------------------- | -------------- |
| GSoC archive (Google)                 | **PENDING / REQUIRES PERMISSION**                                                      | off            |
| LFX Mentorship API (Linux Foundation) | **BLOCKED** until written permission                                                   | off            |
| CNCF mentoring repository (CNCF)      | **CONDITIONAL**: licence basis established; owner approval and one confirmation needed | off            |
| GitHub API (GitHub)                   | **CONDITIONAL**: API terms allow it; needs token model and owner approval              | off            |

---

## 1. Google Summer of Code archive

- **Source:** Google Summer of Code archive and organization data.
- **Authority:** Tier 1, official program.
- **URL:** https://summerofcode.withgoogle.com/ (endpoint used in research:
  `/api/program/{year}/organizations/`, undocumented, used by the site's own front end).
- **Data intended to ingest:** organization name, slug, website, source-code
  URL, licence, tags, tagline, per year (organization/year level only).
- **Terms checked:** Google Terms of Service (https://policies.google.com/terms);
  GSoC FAQ (https://developers.google.com/open-source/gsoc/faq). **The GSoC
  Program Rules and Terms (https://summerofcode.withgoogle.com/rules,
  `/terms`) could not be read**: they are served only by a JavaScript app,
  headless rendering timed out, the page shell contains no legal text, and
  the copies found (search results, a third-party document site) were not
  retrievable. Unread terms cannot grant permission.
- **License:** none found for the archive data. The FAQ page itself is CC BY
  4.0; that covers the FAQ text, not the archive.
- **Automated access permitted:** **Unclear.** Google's general terms bar
  automated access "in violation of the machine-readable instructions on our
  web pages (for example, robots.txt files that disallow crawling...)".
  `summerofcode.withgoogle.com/robots.txt` returns 404 (no such
  instruction). But the same terms say service-specific terms govern, and
  those were not read.
- **Storage permitted:** Unclear (not stated in what was read).
- **Redistribution/display permitted:** Unclear. Google's terms restrict
  copying "any part of our services or software" and allow content use "as
  allowed by these terms and any service-specific additional terms".
  Organization descriptions and logos are also the organizations' own
  content.
- **Attribution required:** Unknown.
- **Personal-data restrictions:** The organization records we intend to use
  carry no person fields. Contact links and communication methods can hold
  contact data and are excluded. The FAQ shows Google honors removal
  requests for archive information ("Use Contact Us or Contact GSoC support
  to request removal").
- **Commercial/proprietary-use restrictions:** Unknown.
- **Decision:** **PENDING / REQUIRES PERMISSION.** Do not fetch live.
- **Evidence:** the two URLs above; probe results in
  RESEARCH/2026-09-21-source-probes.md.
- **Checked at:** 2026-09-21.
- **Reviewer:** owner review pending.
- **Next step:** the owner reads the current Program Rules and Terms in a
  browser and pastes the sections on data, publication, licence and
  third-party use for review; if they are silent or restrictive, send the
  permission request drafted below (not sent).

## 2. LFX Mentorship API

- **Source:** LFX Mentorship platform data.
- **Authority:** Tier 1, official program.
- **URL:** https://api.mentorship.lfx.linuxfoundation.org/projects (used by the
  platform's front end); site https://mentorship.lfx.dev/.
- **Data intended to ingest:** mentorship project title, repository link,
  term names and dates, status (project level).
- **Terms checked:**
  - LFX Platform Use Agreement https://lfx.linuxfoundation.org/platform-use-agreement/
  - LFX Acceptable Use Policy https://lfx.linuxfoundation.org/acceptable-use/
  - LFX Service Terms https://lfx.linuxfoundation.org/service-terms/
  - LFX Privacy Policy Addendum https://www.linuxfoundation.org/legal/lfx-privacy-policy-addendum
  - Linux Foundation Terms of Use https://www.linuxfoundation.org/legal/terms
    (which state LFX use is governed by the LFX agreement instead)
  - `mentorship.lfx.dev/robots.txt`
  - LFX's own repository https://github.com/linuxfoundation/lfx-mentorship
- **License:** the Platform Use Agreement grants "a limited, personal,
  non-exclusive, non-transferable license to use and display the TLF
  Content". No reuse or redistribution licence for platform data was found.
  (The linuxfoundation.org site content is CC BY 3.0, but the Terms of Use say
  LFX is governed by the LFX agreement instead.)
- **Automated access permitted:** **No, on the text.** The Acceptable Use
  Policy prohibits "use[ing] any data mining, robots, or similar data
  gathering or extraction methods in connection with the Platform".
  `mentorship.lfx.dev/robots.txt` is `User-agent: * / Disallow: /`. The
  API host has no robots file, and LFX's own design notes list the catalog
  reads as anonymous (technically open), but technical accessibility is not
  permission. Whether the AUP binds non-registered visitors is unclear;
  because an explicit prohibition exists, the safe reading is prohibited.
- **Storage permitted:** Not stated; not covered by any granted licence.
- **Redistribution/display permitted:** Not granted (personal license only).
- **Attribution required:** Not stated.
- **Personal-data restrictions:** Service Terms: users "will not use the Content
  of any other Mentee, Mentor or Project Maintainer, including... any of their
  personal information, for any purpose other than solely in connection with
  enabling them to participate in the Mentorship Opportunities". The
  Privacy Addendum describes public profile visibility only in the context of
  participation and employer connections. LFX's route notes show member
  emails exist and are redacted. The API also returns a project-level `lfid`.
- **Commercial/proprietary-use restrictions:** No explicit statement found,
  but no commercial reuse licence is granted.
- **Decision:** **BLOCKED** until written permission (or an official data
  path) from the Linux Foundation. The platform is also being rewritten (the
  route contract is a "Proposal"), so the current endpoint may change.
- **Evidence:** the URLs above; robots.txt output; AUP quote.
- **Checked at:** 2026-09-21.
- **Reviewer:** owner review pending.
- **Next step:** owner decides whether to send the permission request drafted
  below (not sent).

## 3. CNCF mentoring repository

- **Source:** CNCF mentoring repository.
- **Authority:** Tier 2 official ecosystem source, **CNCF projects only**.
- **URL:** https://github.com/cncf/mentoring (`programs/lfx-mentorship/`,
  `programs/summerofcode/`).
- **Data intended to ingest:** term timelines, selected CNCF projects,
  program titles, technologies, upstream issue links, LFX project ids and
  mentor name, GitHub handle and role.
- **Terms checked:** the repository's `LICENSE` (Apache-2.0), `LICENSE-CONTENT`
  (CC BY 4.0, full text), `CONTRIBUTING.md`, `programs/lfx-mentorship/automation/`
  layout, GitHub Terms of Service API terms and Acceptable Use Policies.
- **License and scope (Q18, answered):** `CONTRIBUTING.md`, "Licenses": "This
  repository uses two licenses, depending on what you contribute: Content
  (guides, program materials, and documentation): CC-BY-4.0 (LICENSE-CONTENT);
  Code (automation and scripts): Apache-2.0 (LICENSE)." Program materials
  (term READMEs, project lists, ideas) are therefore CC BY 4.0. Contributions
  come under the DCO. GitHub reports the repository as Apache-2.0 because
  that is the top-level `LICENSE`.
- **Automated access permitted:** Yes through the GitHub API or raw file
  access within GitHub's terms and rate limits (identifiable client, no
  excessive bulk activity).
- **Storage permitted:** Yes for CC BY content, subject to attribution.
- **Redistribution/display permitted:** Yes with attribution (CC BY 4.0
  permits commercial and proprietary use).
- **Attribution required:** Yes: credit CNCF, link the source and the licence,
  indicate changes, do not imply endorsement. Text in section 6.
- **Personal-data restrictions:** CC BY 4.0 does not license privacy rights,
  and GitHub's policies require collecting personal information in line with
  its Privacy Statement and honoring removal requests. `lfx-export.json`
  and `lfx-tracking.csv` contain mentor emails and LFIDs; markdown idea
  files list emails. These are never fetched into storage.
- **Commercial/proprietary-use restrictions:** none from CC BY 4.0; the
  attribution and no-additional-restrictions terms apply.
- **Decision:** **CONDITIONAL.** Licence basis is established for program
  materials. Before marking APPROVED, the owner should (a) approve storing
  mentor name, handle and role (Q24), and (b) accept the residual ambiguity
  that generated export files (`lfx-export.json`) are treated as "program
  materials" rather than "code": a one-line confirmation from CNCF
  maintainers would close it (draft below, not sent).
- **Evidence:** `CONTRIBUTING.md` lines 93-98, `LICENSE-CONTENT`, `LICENSE`.
- **Checked at:** 2026-09-21.
- **Reviewer:** owner review pending.

### Field-level matrix for CNCF data (Q18)

| Field / file                                 | Fetch                     | Store                               | Display                         | Notes                                                       |
| -------------------------------------------- | ------------------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Term timeline and status from README (dates) | yes                       | yes                                 | yes                             | attribute; status derived from dates, prose never overrides |
| CNCF project name, slug, maturity            | yes                       | yes                                 | yes                             | attribute                                                   |
| Program title (short)                        | yes                       | yes                                 | yes                             | attribute; sanitized                                        |
| Program description                          | yes                       | excerpt (max 400 chars) + link      | excerpt + link                  | link-first policy; state "summarized"                       |
| Technologies, skills                         | yes                       | yes                                 | yes                             | attribute                                                   |
| Upstream issue URL, LFX URL                  | yes                       | yes                                 | yes                             | URLs are facts                                              |
| LFX project UUID                             | yes                       | yes (external id)                   | internal use, join key          | taken from CNCF's link, not from the LFX API                |
| Mentor name, GitHub handle, role             | yes                       | **only after owner approval (Q24)** | with source and removal process | public in CNCF repo; still personal data                    |
| Mentor email, LFID                           | **never**                 | **never**                           | **never**                       | not fetched into storage                                    |
| `lfx-tracking.csv`                           | **do not fetch**          | no                                  | no                              | contains contact columns                                    |
| Prerequisites (resume, cover letter flags)   | no                        | no                                  | no                              | not needed                                                  |
| Mentee information                           | no                        | no                                  | no                              | not present in export; never ingest                         |
| Historical term folders (2019-2027)          | yes                       | yes                                 | yes                             | CC BY, attribute; older layouts vary                        |
| `programs/summerofcode/*.md` ideas           | yes                       | yes                                 | as "Proposed idea"              | proposals, not participation (D-007); strip emails          |
| Cache                                        | sanitized projection only |                                     |                                 | never raw bodies                                            |

## 4. GitHub API

- **Source:** GitHub REST/GraphQL API. **Authority:** Tier 3 (repository facts).
- **URL:** https://docs.github.com/en/rest ; terms
  https://docs.github.com/en/site-policy/github-terms/github-terms-of-service ;
  https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies
- **Data intended to ingest:** repository metadata, languages, contributors
  (public handle), commits, issues and PR metadata and counts, releases,
  documentation file presence and short excerpts.
- **Automated access permitted:** Yes via the API within rate limits;
  "abuse or excessively frequent requests" can lead to suspension; tokens
  must not be shared to evade limits.
- **Storage / display:** GitHub's terms do not restrict lawful use of public
  repository contents; each repository's own licence governs its text, so
  store facts and short attributed excerpts with links, not mirrors.
- **Attribution:** per repository licence for excerpts; link to source.
- **Personal-data restrictions:** information from the Service must not be
  used for spam or "selling personal information, such as to recruiters,
  headhunters, and job boards"; collectors must follow the GitHub Privacy
  Statement, secure personal data and respond promptly to removal requests.
  No commit author emails are stored.
- **Commercial/proprietary use:** not restricted by these terms beyond the
  above.
- **Decision:** **CONDITIONAL.** Basis established; needs the token model
  (Q21) and owner approval.
- **Evidence:** URLs above. **Checked at:** 2026-09-21. **Reviewer:** owner
  review pending.

---

## 5. Sources not usable, and legitimate alternatives (product vision unchanged)

The pipeline is `Source -> Evidence -> Normalization -> Provenance -> OpenSourceX`.
If a source cannot legally provide a dataset, another legitimate source
provides it; no dataset is dropped from the roadmap.

| Dataset                                   | Blocked source         | Legitimate paths                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LFX term-level history, all LF ecosystems | LFX API (blocked)      | written permission from the Linux Foundation; CNCF repository (CC BY) for CNCF projects now; other LF ecosystems that publish program data under open licences on GitHub (not yet researched: only three guessed repository names were tried and none existed, which proves nothing); ecosystem or project pages with clear reuse terms; owner-curated entries with citations |
| GSoC organization/year history            | GSoC archive (pending) | written permission or confirmed terms from Google; organization-published pages with open licences; CNCF idea files as proposals only                                                                                                                                                                                                                                         |
| GSoC project-level and mentor history     | none available         | remains "Not verified" (D-007)                                                                                                                                                                                                                                                                                                                                                |

## 6. Attribution text (CNCF-derived content)

"Source: CNCF mentoring repository (https://github.com/cncf/mentoring),
licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes
made: fields selected and normalized; descriptions summarized. CNCF does
not endorse OpenSourceX."

## 7. Unresolved ambiguities

1. GSoC Program Rules and Terms text unread (needs the owner or Google).
2. Whether the LFX AUP binds anonymous API callers (moot while blocked).
3. Whether CNCF generated export files count as "program materials".
4. Lawful basis and comfort for storing mentor names and handles (Q24);
   counsel recommended.
5. Whether GitHub personal data (handles) processing needs a documented
   removal contact (depends on Q13).

## 8. Permission requests (drafts for the owner; NOT sent)

**To Google Summer of Code (via the GSoC contact form):** "I'm building
OpenSourceX, a platform that helps people understand open-source programs
and projects. I would like to retrieve, store and display organization-level
participation data (organization name, website, tags, year) from the GSoC
archive with attribution to Google Summer of Code. Is automated retrieval
of this public data permitted, under what terms, and how should we attribute
it? We would exclude contact information and honor removal requests."

**To the Linux Foundation (LFX):** "I'm building OpenSourceX, which helps
people find open-source projects and understand program participation. I
would like to retrieve published LFX Mentorship project listings (title,
repository link, term names and dates) to show historical term
participation with attribution. The Acceptable Use Policy prohibits data
mining and robots. Is there an official API, data license or written
permission for this use? We would not collect personal information and would
honor removal requests."

**To CNCF mentoring maintainers (GitHub issue):** "Can you confirm that the
generated files under `programs/lfx-mentorship/*/lfx-export.json` are
'program materials' covered by CC BY 4.0, per CONTRIBUTING.md? We plan to
use non-personal fields with attribution."
