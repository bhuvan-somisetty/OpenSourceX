# Documentation Review

Date: 2026-09-21. Scope: every file in `docs/`, `README.md`, `SECURITY.md`,
Git history and the GitHub remote. Evidence for source claims:
`RESEARCH/2026-09-21-source-probes.md`.

## Limits of this review

**The original project handoff was never provided.** Only the master prompt
was available. Requirements below are checked against the master prompt, not
the handoff. Anything in the handoff that the prompt does not repeat (its
open questions, edge cases, database and API concepts, MVP definition) could
not be checked. See finding C-1.

Severity: CRITICAL, HIGH, MEDIUM, LOW, ACCEPTED. "Blocks" says which
milestone cannot safely start until the finding is resolved.

---

## Addendum, 2026-09-21 (later): new source and a correction

- **Correction.** The first review cited 720 LFX projects and 125 term
  spellings. That crawl was capped by my own loop limit. The complete crawl
  is 1,301 projects, 151 spellings (numbers above are corrected).
- **New source.** The CNCF mentoring repository (DATA_SOURCES section 4) is
  Apache-2.0 with CC-BY-4.0 content, exposes mentors per term for CNCF
  projects, and joins to the LFX API by project UUID. Effects:
  - C-2: partly eased for CNCF data (explicit reuse licence, attribution
    required). It does not cover non-CNCF LFX projects or GSoC.
  - H-1: mentor history is now possible for CNCF-LFX terms, still not GSoC.
  - H-3: a real cross-source join key exists (LFX UUID); resolution to
    GitHub repos and GSoC organizations is still open.
  - H-5: confirmed personal-data risk (mentor emails in the CSV); never
    ingest them. Attribution to CNCF is required.
  - New finding **M-11**: the source's own status text can be stale.

## CRITICAL

### C-1 Original handoff not available for traceability

- **Wrong:** requirement preservation cannot be certified. Scope, edge cases
  and open questions from the handoff may be missing or contradicted.
- **Matters:** the master prompt makes the handoff the source of truth.
- **Change:** provide the handoff, then re-run the traceability matrix below.
- **Blocks:** M1 scope freeze. M0 (scaffolding) is not blocked.

### C-2 Ingestion of both program sources has unresolved permission status

- **Wrong:** neither GSoC nor LFX offers a documented public API. The
  endpoints are those the sites' own front ends use. `mentorship.lfx.dev`
  serves `robots.txt` with `Disallow: /` for all agents. Neither site's
  terms were actually read (GSoC's page is a JS app our fetch could not
  render). D-003 says "review terms before production" but treats throttling
  as sufficient mitigation.
- **Matters:** the two Tier 1 sources are the product's core. A takedown,
  block or terms violation would remove the differentiator.
- **Change:** read both terms manually; ask Google (GSoC) and the Linux
  Foundation (LFX) for permission or an official data path; record the
  outcome in DECISIONS. Until then, use them only for local read-only
  research and recorded snapshots, not a public production crawler.
- **Blocks:** production ingestion. A local spike in M1 is acceptable.

## HIGH

### H-1 GSoC data is organization-per-year, not project- or mentor-level

- **Wrong:** PRD FR2, the project page and the interview/community features
  imply GSoC history per project and mention "mentor history where
  available". Verified: GSoC's `/projects/` endpoint returns 403 and
  organization records contain no project, mentor or person fields. LFX is
  project-level; GSoC is organization-level. DATA_MODEL treats them as one
  `participation` shape.
- **Matters:** presenting org participation as project participation, or
  implying mentor data, would be a false claim.
- **Change:** model participation grain explicitly (organization x GSoC year
  vs project x LFX term). State in PRD and UI that GSoC history is
  organization-level and mentor history is unavailable from current sources.
- **Blocks:** M1 schema.

### H-2 LFX term normalization is far harder than "map by dates"

- **Wrong:** TECHNICAL_DESIGN says terms map by start date. Real data has 151
  distinct spellings ("Summer PT/FT", "Spring'2022", "01-Mar-May", "2026
  Term 1: March - May"), part-time/full-time tracks, and one future term
  (2027).
- **Matters:** the LFX term-level history grid is a headline feature.
- **Change:** define canonical term = (year, season/term number, track);
  derive from dates first, use name only as a hint, keep `raw_name`; flag
  unmapped terms instead of guessing; treat future terms as "upcoming", not
  participation. Add fixtures from recorded real data.
- **Blocks:** M1.

### H-3 Cross-source entity resolution is under-specified

- **Wrong:** ARCHITECTURE and TECHNICAL_DESIGN mention linking but not how a
  GSoC org, an LFX project and a GitHub org/repo become one Project or
  Organization. Real data: of 1,301 LFX projects, 78 link only a GitHub
  organization and 61 link neither a GitHub repo nor an org; GSoC provides
  `source_code` and `website_url` of varying quality. Slug stability across
  GSoC years is untested.
- **Matters:** wrong merges silently corrupt history.
- **Change:** specify match keys, confidence levels, a manual-override table
  and an "unlinked" state shown honestly in the UI.
- **Blocks:** M1.

### H-4 "Automatic data updates" is a requirement with almost no design

- **Wrong:** only ARCHITECTURE/OPERATIONS mention scheduling. Missing:
  per-source cadence, change detection, handling removals and renames,
  backfill vs incremental, snapshot retention, and how a failed refresh
  affects freshness.
- **Matters:** it is a stated core requirement and drives trust.
- **Change:** add a "sync design" section (in TECHNICAL_DESIGN or OPERATIONS)
  and cadence and update-frequency fields to DATA_SOURCES.
- **Blocks:** M1.

### H-5 No policy for third-party content, licensing and personal data

- **Wrong:** the product will store and redisplay GSoC organization
  descriptions and logos (hosted by Google), repository text (READMEs,
  issues) and GitHub logins. No doc covers content licensing, attribution,
  hotlinking vs copying, or personal-data handling (logins, and never
  emails).
- **Matters:** the proprietary model (D-006) makes this a real exposure.
- **Change:** write a content and privacy policy section; default to
  linking and short attributed excerpts.
- **Blocks:** M3 (storing repo text). M0/M1 metadata-only is not blocked.

### H-6 UI/UX spec cannot yet produce the premium experience required

- **Wrong:** UI_UX_SPECIFICATION and DESIGN_SYSTEM are checklists. No
  information architecture per page, wireframes, concrete tokens (no color or
  type values), dark-theme rules, hero concept, microcopy, interaction or
  performance budget. Nothing separates beginner and expert flows, although
  the prompt requires five explicit UX checks.
- **Matters:** UX quality is called out as very high priority.
- **Change:** add a design phase before M4 producing concrete tokens,
  wireframes for key pages and a visual direction for owner approval.
- **Blocks:** M4. Not M0/M1.

### H-7 Abuse of shared quotas is not addressed

- **Wrong:** `POST /repositories/analyze` lets anonymous users spend our
  single GitHub token budget (5,000 requests/hour), and interview/AI
  endpoints let anonymous users spend LLM budget.
- **Matters:** cheap denial of service and cost exposure.
- **Change:** per-IP and global budgets, per-repo cooldown and cache,
  queue with backpressure, LLM spend caps, optional sign-in gate.
- **Blocks:** M3 (GitHub) and M5 (LLM).

### H-8 PR/contribution intelligence was silently deferred to P2

- **Wrong:** the master prompt calls it "a major differentiating feature" and
  lists a "Contribution" interview category. PRD puts it in P2 and the MVP
  interview excludes those questions, so the "Sam" persona is not served in
  the MVP. I made that call without recording it as a decision.
- **Matters:** it may narrow the vision more than intended.
- **Change:** owner decision (Q9). Either keep P2 and say so in DECISIONS,
  or pull a thin version into MVP.
- **Blocks:** neither M0 nor M1.

## MEDIUM

- **M-1 Data model shape.** `fact` is a generic value_json table and
  `participation.subject_type/subject_id` is a polymorphic reference with no
  foreign-key integrity. Weak typing, hard to query and validate. Needs an
  explicit decision (typed tables carrying provenance columns vs generic
  facts). Blocks M1 schema. See Q10.
- **M-2 Community intelligence is thin.** A `CommunityChannel` table exists
  but nothing maps GSoC `contact_links`, `direct_comm_methods` and
  `social_comm_methods`, or GitHub discussions, governance files, code of
  conduct and labels. Master prompt lists these.
- **M-3 Recommendation ordering vs D-004.** RECOMMENDATION_ENGINE orders by
  "count and weight of matched reasons; weights shown". That is a score in
  practice. Either accept as a transparent ranking and say so, or order
  differently. Decision needed (Q11).
- **M-4 Confidence is defined two ways.** DATA_PROVENANCE uses numeric 0-1;
  AI_ARCHITECTURE uses labels. Define one scale and what earns each level.
- **M-5 Deployable count vs D-001.** web + Fastify API + worker is three
  deployables. A separate API may be premature for the MVP (Next.js route
  handlers plus a worker would be two). Decision needed before M0 (Q12).
- **M-6 Unused useful source signal.** GSoC `/api/program/{year}/` exposes
  phase and milestone dates, the strongest "has the program officially
  announced?" signal for freshness and FORECASTING.md. Not yet used in the
  design.
- **M-7 Technology and topic normalization.** GSoC tech/topic tags are free
  text; matching and recommendations need a taxonomy strategy.
- **M-8 Retention and privacy.** No retention for snapshots or interview
  answers; the doc says "short retention" without a period.
- **M-9 SECURITY.md contact.** It points to GitHub security advisories, which
  a private repository may not offer to outside reporters. Needs an
  owner-supplied contact (Q13).
- **M-10 DATA_SOURCES template incomplete.** The prompt requires update
  frequency, rate limits, terms, historical coverage, reliability and
  implementation method per source. Partly filled; GSoC and LFX rate limits
  are unknown.

- **M-11 Source text can be stale.** CNCF's 2026 Term 3 README says
  "Planning" after the term began. Freshness must not trust status prose.

## LOW

- **L-1** No `.gitattributes`; Git warns about LF to CRLF conversion on
  Windows.
- **L-2** No CI, workflow files or issue/PR templates yet. Planned for M0;
  templates are optional for a proprietary repo.
- **L-3** PRD and RECOMMENDATION_ENGINE say "CONTRIBUTING/setup" without
  saying it means the target repository's files. Reword.
- **L-4** FORECASTING has no table or schema (P3, acceptable).
- **L-5** API_SPECIFICATION lacks versioning policy, error catalogue,
  pagination detail and an OpenAPI plan.
- **L-6** `CODE_OF_CONDUCT.md` from the prompt's structure is absent; likely
  unnecessary for a proprietary product (Q14).
- **L-7** LFX endpoint exposes only published projects; coverage claims must
  say "published projects visible via the endpoint".

## ACCEPTED

- **A-1 Proprietary model.** D-006 and Q6 document the decision; README says
  the repository is not licensed for reuse; there is no LICENSE or
  CONTRIBUTING. No contradiction with helping users contribute to other
  projects: the product's users contribute to third-party repositories, and
  this repository stays closed. Caveat: H-5.
- **A-2** No aggregate health score (D-004).
- **A-3** pg-boss instead of Redis for the MVP (D-002); no vector database
  (D-005); no microservices (D-001, but see M-5).
- **A-4** Provenance states CONFIRMED, HISTORICAL, INFERRED, FORECAST,
  UNKNOWN, STALE, CONFLICTING are all defined.
- **A-5** AI design (retrieval, numbered evidence, schema output, code-level
  validation, untrusted-content boundary) is sound in principle; the gaps are
  H-7, M-4 and missing concrete tests.
- **A-6** SSRF design (parse and rebuild GitHub URLs, allow-listed hosts) is
  adequate for the MVP.
- **A-7** Personas are fictional archetypes for design, not presented as real
  data.

---

## Requirement traceability (against the master prompt)

| Requirement                                     | Where                          | Status                                        |
| ----------------------------------------------- | ------------------------------ | --------------------------------------------- |
| Program intelligence                            | PRD MVP 1, API programs        | Covered; GSoC is org-level (H-1)              |
| GSoC history                                    | DATA_SOURCES, PRD              | Partial: 2022-2026 only, org-level            |
| LFX term-level history                          | DATA_SOURCES, TECHNICAL_DESIGN | Partial: feasible, normalization hard (H-2)   |
| Repository intelligence                         | PRD MVP 2, API                 | Covered at outline level                      |
| Project/activity analysis                       | TECHNICAL_DESIGN               | Covered; evidence table, no score             |
| Recommendations                                 | RECOMMENDATION_ENGINE          | Partial (M-3), personalization P2             |
| Community intelligence                          | DATA_MODEL                     | Weak (M-2)                                    |
| Contribution guidance                           | PRD MVP 6                      | Covered                                       |
| Project learning                                | PRD, UI                        | Partial: levels 1-3 in MVP, no content design |
| PR/contribution intelligence                    | CONTRIBUTION_INTELLIGENCE      | Deferred to P2 (H-8)                          |
| Interview preparation                           | INTERVIEW_SYSTEM               | Partial: basic mode only                      |
| Source provenance                               | DATA_PROVENANCE                | Covered                                       |
| Freshness                                       | DATA_PROVENANCE                | Covered; windows are initial guesses          |
| Confirmed/historical/inferred/forecast          | DATA_PROVENANCE, FORECASTING   | Covered                                       |
| Automatic data updates                          | ARCHITECTURE, OPERATIONS       | Under-specified (H-4)                         |
| Ecosystem graph, timeline, readiness, workspace | PRD P2/P3                      | Deferred, recorded in roadmap                 |
| Notifications                                   | PRD P3                         | Deferred                                      |

## Checks against the numbered review items

- **1 Scope narrowed?** Modestly: H-8 (PR intelligence), M-2 (community).
  Ecosystem graph, timeline, readiness, workspace are deferred by phase, not
  removed.
- **2-4 Proprietary model:** correct and documented (A-1).
- **9 Real sources:** endpoints exist and return real data (verified), but
  are undocumented and permission is unresolved (C-2). No API was invented.
- **10 Data model can represent it?** Mostly, with changes: grain (H-1),
  terms (H-2), identity (H-3), typing (M-1). Forecast schema missing (L-4).
- **11 AI prevents hallucination/injection?** Design yes; enforcement details,
  spend caps and tests are missing (A-5, H-7, M-4).
- **12 Recommendations explainable?** Reasons are sourced; ranking weights
  need care (M-3).
- **13 UX strong enough?** No (H-6).
- **14 MVP realistic?** Largely; scope is large and M-5 should be settled.
- **15-16 Attribution and sensitive data:** no AI-tool, vendor or co-author
  attribution and no generated-by text in any tracked file or commit message;
  0 commit trailers; the sole author and committer is
  `bhuvan-somisetty`; secret-pattern scan found 0 matches; no `.env`
  tracked.
- **17 Fake data:** none. Personas are archetypes; URLs used in docs resolve
  (HTTP 200) or are labeled templates.
- **18 Repo state:** the working tree was clean and identical to
  `origin/main` (0 differing files) before this review's own edits.
  Repository visibility: private.

## Before M0 (scaffolding only)

1. Decide deployables: web + API + worker or web (with route handlers) +
   worker (M-5, Q12).
2. Add `.gitattributes` (L-1).
   No source or data decisions are required for M0.

## Before M1 (ingestion)

1. Provide the handoff and re-run traceability (C-1).
2. Read both programs' terms and decide the permission path (C-2, Q2).
3. Fix the PRD/DATA_MODEL grain (H-1) and decide typed vs generic facts
   (M-1, Q10).
4. Specify term normalization (H-2), entity resolution (H-3) and sync design
   (H-4).

## Recommended implementation order

1. Resolve C-1 and C-2; apply the doc fixes above.
2. M0 foundation.
3. M1 as a local, read-only spike on recorded snapshots, then the real
   schema.
4. Design phase (tokens, wireframes, visual direction) in parallel with M1.
5. M2 API, then M3 GitHub intelligence (after H-5 and H-7).
6. M4 web, M5 learning and interview (after H-7), M6 audit.

---

# Addendum 2: owner decisions and second consistency audit (2026-09-21)

## Decisions applied

Owner decisions were applied to the docs: Q7 handoff (full handoff is
source of truth), Q8 GSoC granularity (D-007), Q9 PR phasing (D-011), Q10
hybrid model (D-008), Q11 transparent recommendations (D-010), Q12 Next.js
route handlers plus worker (D-009), Q13 contact left unresolved, Q14 no
CONTRIBUTING or code of conduct (D-012), Q15 policy (DATA_POLICY.md,
D-014), Q16 no contact data (D-014), the CNCF provider (D-013), term
normalization and entity resolution (D-015), and the update pipeline
(D-016). New documents: DATA_POLICY, INGESTION_PIPELINE, ENTITY_RESOLUTION,
TRACEABILITY.

## Additional research finding

`lfx-export.json` itself contains `email` and `lfid` in every mentor object
(133 email-like strings), and CNCF's GSoC idea files list mentor emails, so
the privacy rule covers JSON and markdown, not only the CSV. CNCF's
`mentors/` and `mentees/` folders hold only guide READMEs, not rosters, and
`programs/summerofcode/*.md` are project _ideas_, not participation.

## Status of earlier findings

| ID                          | Status                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 handoff                 | Resolved (Q7); traceability in TRACEABILITY.md                                                                                                             |
| C-2 permissions             | **Still open (Q2).** No source is `approved`; register in DATA_POLICY.md. CNCF blocked only on Q18 and the sanitizer                                       |
| H-1 GSoC grain              | Resolved by design (D-007, DATA_MODEL 3)                                                                                                                   |
| H-2 term normalization      | Resolved by design (INGESTION_PIPELINE 3); implementation in M1                                                                                            |
| H-3 entity resolution       | Resolved by design (ENTITY_RESOLUTION.md); implementation in M1                                                                                            |
| H-4 automatic updates       | Resolved by design (INGESTION_PIPELINE.md)                                                                                                                 |
| H-5 content and privacy     | Resolved by policy (DATA_POLICY.md); retention values await Q19                                                                                            |
| H-6 UI/UX depth             | **Still open (Q22).** Needs a design phase before M4                                                                                                       |
| H-7 quota abuse             | Requirements written (SECURITY_ARCHITECTURE); numbers set in M3 and M5                                                                                     |
| H-8 PR intelligence         | Resolved (D-011)                                                                                                                                           |
| M-1 data model shape        | Resolved (D-008)                                                                                                                                           |
| M-2 community intelligence  | Partly: `community_channel` typed, GSoC comm links now in scope; GitHub discussions and governance files listed in the PRD. Field mapping happens in M1/M3 |
| M-3 ranking vs D-004        | Resolved (D-010); no numeric score                                                                                                                         |
| M-4 confidence scale        | Resolved (single scale in DATA_PROVENANCE)                                                                                                                 |
| M-5 deployables             | Resolved (D-009): app plus worker                                                                                                                          |
| M-6 program metadata signal | Documented in FORECASTING; use pending Q2                                                                                                                  |
| M-7 technology taxonomy     | Open: alias table exists, matching strategy to define in M1                                                                                                |
| M-8 retention               | Proposals written; confirm via Q19                                                                                                                         |
| M-9 security contact        | Open (Q13), owner input                                                                                                                                    |
| M-10 DATA_SOURCES template  | Mostly filled; GSoC and LFX rate limits still unknown                                                                                                      |
| M-11 stale source text      | Resolved (status derived from dates)                                                                                                                       |
| L-1 `.gitattributes`        | Scheduled for M0                                                                                                                                           |
| L-2 CI and templates        | M0; templates optional                                                                                                                                     |
| L-3 "CONTRIBUTING" wording  | Fixed in the PRD                                                                                                                                           |
| L-4 forecast schema         | Added to DATA_MODEL section 9                                                                                                                              |
| L-5 API detail              | Open, low priority                                                                                                                                         |
| L-6 code of conduct         | Resolved (D-012)                                                                                                                                           |
| L-7 LFX coverage wording    | Applied ("published projects visible via the endpoint")                                                                                                    |

## Remaining blockers

- **Before any production ingestion:** Q2 (GSoC and LFX permission), and for
  CNCF, Q18 plus the sanitizer with planted-PII tests.
- **Before M4:** Q22 design phase.
- **Before M3 and M5:** quota and spend limits (H-7), Q21 token model, Q5
  LLM provider, Q19 retention.
- **Owner input:** Q13 security contact.

## Second audit: results

Automated checks were run on the final tree and history; the results are in
the completion report. Findings that need a decision are Q2, Q13, Q18, Q22.
