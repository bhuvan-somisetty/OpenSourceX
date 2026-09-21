# Data Policy: Ingestion, Third-Party Content and Privacy

Status: policy for design. It binds every provider and every milestone.
Resolves Q15, Q16 and Q17. Evidence: RESEARCH/2026-09-21-source-probes.md.

## 1. Principles

1. **Necessity.** Ingest and store only what a product feature needs.
2. **Permission first.** No automated ingestion path goes live until its
   terms, robots policy, licence and attribution needs are documented and the
   path is marked `approved` in the register below.
3. **Attribution and provenance.** Every stored fact links to its source.
   Where a licence requires attribution, the UI shows it.
4. **Minimize personal data.** Public identifiers only, never contact data.
5. **Link over copy.** Prefer linking to the source; store short excerpts
   and derived facts, not mirrors.
6. **Keep history, delete what we must.** Historical facts are preserved;
   personal data and raw bodies follow the retention rules below.

## 2. Source permission register

`Ingestion` values: `approved`, `pending` (do not run in production),
`blocked`. Nothing is `approved` yet: no automated production ingestion has
been authorized. Local read-only research is allowed. The reviewed decisions,
evidence and field-level rules are in SOURCE_PERMISSIONS.md; the table below is
superseded by it where they differ (LFX is **blocked**: its Acceptable Use Policy
prohibits data mining and robots).

| Source                                                            | Official API?                              | Terms reviewed                                                                                                                                                  | Robots                                                                        | Licence / reuse                                                                                                                                                                                                  | Attribution                                                                       | Ingestion                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GSoC archive JSON (`summerofcode.withgoogle.com/api/program/...`) | No; undocumented endpoint used by the site | **No.** `/terms` and `/rules` are a JS app; text not readable by our fetch                                                                                      | `/robots.txt` returns 404                                                     | Unknown                                                                                                                                                                                                          | Unknown                                                                           | **pending**                                                                     |
| LFX Mentorship API (`api.mentorship.lfx.linuxfoundation.org`)     | No documented public API found             | **No.** Linux Foundation site terms (linuxfoundation.org/legal/terms) contain no automated-access clause per our reading, but they are not specific to this API | `mentorship.lfx.dev/robots.txt` is `Disallow: /`; API host has no robots file | Unknown                                                                                                                                                                                                          | Unknown                                                                           | **pending**                                                                     |
| CNCF mentoring repository (`github.com/cncf/mentoring`)           | GitHub API / raw files                     | GitHub API terms read (below)                                                                                                                                   | GitHub robots applies to the website; we use the API                          | Code Apache-2.0; `LICENSE-CONTENT` is CC BY 4.0. The scope of each licence over specific files is **not stated** in the README; treat the content licence as applying to documentation content and confirm scope | Required by CC BY 4.0: credit CNCF, link the source and licence, indicate changes | **pending** (licence permits reuse; sanitizer and scope check must exist first) |
| GitHub REST/GraphQL API                                           | Yes                                        | Read: GitHub Terms of Service, API Terms                                                                                                                        | n/a (API)                                                                     | Public repository content is governed by each repository's licence; GitHub's terms do not restrict lawful use of public repo contents                                                                            | Per repo licence                                                                  | **pending** (needs a token and rate-budget design)                              |
| Organization/project websites (Tier 2)                            | varies                                     | not reviewed                                                                                                                                                    | per site                                                                      | per site                                                                                                                                                                                                         | per site                                                                          | **pending, per site**                                                           |

### GitHub API terms, as read on 2026-09-21

- Excessive request rates can lead to suspension of API access.
- Sharing tokens to evade rate limits is forbidden.
- Using API data for spam, or to sell users' personal information to
  recruiters, headhunters or job boards is forbidden.
- The API section does not explicitly address storing public data; the
  general terms say they do not restrict lawful use of public repository
  contents by third parties.
- **Consequence:** OpenSourceX must never repackage contributor or mentor
  data for recruiting. No "talent search", no contributor export.

### Resolving `pending`

For GSoC and LFX: read the actual terms in a browser, ask Google and the
Linux Foundation for permission or an official data path, record the answer
in DECISIONS.md. Until then these sources are used only for local research.
For CNCF: implement the sanitizer, confirm licence scope, add attribution to
the UI, then mark `approved`.

## 3. Personal-data minimization (Q16)

**Never stored, indexed, embedded, logged, exposed or exported:**
email addresses, LFIDs, phone numbers, any contact detail, commit author
emails, and any field named or shaped like them.

**Allowed, only when published for the relevant purpose and needed:** name,
public GitHub handle and id, publicly documented role (e.g. mentor for a
named term), and the public project relationship, each with provenance.

**Verified exposure in real sources (2026-09-21):**

- `lfx-tracking.csv` has mentor email and LFID columns.
- `lfx-export.json` also contains `email` and `lfid` in every mentor object
  (133 email-like strings in the 2026 Term 3 file).
- CNCF GSoC idea files (`programs/summerofcode/{year}.md`) list mentors with
  emails inline (51 email-like lines in the 2025 file).

**Enforcement (must exist before any CNCF ingestion):**

1. **Allowlist parsers.** A parser reads named fields only (`name`,
   `github_handle`, `role`). Unknown fields are dropped, not stored.
2. **Never persist raw bodies** of these files. Compute the content hash in
   memory; persist only the sanitized projection.
3. **Scrub before anything else.** A regex email/LFID scrubber runs on all
   free text (descriptions, markdown) before storage, search indexing,
   embeddings, AI context or logs.
4. **Schema guard.** No column, JSON key or index may be named or shaped like
   email, phone or LFID; a test fails the build if one appears.
5. **Logs and analytics** receive ids and counts only, never record bodies.
6. **AI context** is assembled from stored sanitized data only, so it cannot
   contain what was never stored.
7. **Tests:** fixtures with planted emails and LFIDs must show none reach the
   database, API, search index or AI prompt.

## 4. Third-party content

- **Facts and metadata** (names, dates, counts, URLs, terms): stored with
  provenance.
- **Descriptions and READMEs:** store short attributed excerpts or a
  derived summary labeled as such, plus a link; do not mirror whole
  documents. Respect each repository's licence.
- **Logos and images:** hotlink from the source or omit; do not re-host
  without permission. Never imply endorsement.
- **Untrusted content** is treated as data everywhere (AI_ARCHITECTURE.md).
- **CC BY attribution (CNCF):** show "Source: CNCF mentoring repository,
  CC BY 4.0", link to the file and the licence, and note when we changed or
  summarized the content.
- **Trademarks:** program and project names are used only to identify them.

## 5. Retention and deletion

| Data                                          | Retention                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Sanitized snapshots (parsed projections)      | Keep the latest per source plus one per term/year for history; older duplicates by hash may be pruned                              |
| Raw bodies of email-bearing files             | Never persisted                                                                                                                    |
| Historical facts and participation            | Kept (product value); superseded, never overwritten                                                                                |
| Person records (name, GitHub id/handle, role) | Kept while a source still publishes them; delete on removal request or when the source removes them and no historical need remains |
| Interview sessions and answers                | Anonymous in MVP; delete after 30 days unless the user has an account and saves them (period is a proposal, Q19)                   |
| Logs                                          | Ids and counts only, 30 days (proposal)                                                                                            |
| Caches                                        | TTL per freshness policy                                                                                                           |

**Removal requests:** a documented process lets a named person ask for
removal of their person record; we act on verified requests (Q20 covers the
owner contact channel).

## 6. Users

MVP: read-only and anonymous; no accounts, no tracking beyond privacy-safe
aggregate metrics. Interview answers are treated as personal and are never
used to train models or shared. Accounts (P3) require a privacy notice,
data export and deletion.

## 7. Caching

Cache derived responses with TTL from the freshness policy. Cache raw source
responses only in sanitized form. Respect `ETag`/`If-Modified-Since`.
