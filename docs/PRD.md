# Product Requirements Document

Status: draft v0.1. Items are labeled **MVP**, **P2**, **P3**, **Later**.
Nothing here is implemented unless IMPLEMENTATION_PLAN.md says so.

## 1. Problem

Discovering, evaluating and starting to contribute to open source is
fragmented, unverifiable and intimidating. See PRODUCT_VISION.md.

## 2. Personas

- **Asha, first-timer:** knows some Python, wants a welcoming project.
- **Ravi, program applicant:** targets GSoC/LFX, needs history and prep.
- **Dana, experienced dev:** evaluating a repo's health and architecture.
- **Sam, active contributor:** must explain a merged PR in an interview.
- **Mira, mentor/maintainer (P3):** wants prepared applicants.

## 3. Principles

Truth over polish; evidence for every claim; explainable, never opaque scores;
labeled inference; freshness always visible; no fake data.

## 4. Scope by phase

### MVP (must prove: discover or analyze a project with source-backed data and learn how to start contributing)

1. **Program intelligence:** GSoC organization participation by year (the
   only level current authoritative data supports), LFX projects and terms,
   and CNCF mentors and selected projects for CNCF-LFX terms. CNCF data
   covers CNCF projects only and is labeled as such. Each source goes live
   only after DATA_POLICY approval.
2. **GitHub repository intelligence:** analyze a public repo by URL:
   metadata, languages, contributors, issues, releases, contribution docs,
   code of conduct, governance files, labels, discussions availability.
   Basic PR metadata is included: PR count, recent PR activity, merged-PR
   activity and links to relevant PRs where available (D-011).
3. **Project discovery:** search and filter by language, technology, program.
4. **Historical participation with explicit granularity:** an LFX/CNCF
   term grid per project; GSoC shown per **organization** and year. See
   section 5a.
5. **Activity analysis:** evidence table (commits, PRs, issues, releases),
   no single score (D-004).
6. **Contribution guidance:** the target repository's own contribution
   docs, setup steps and labels ("good first issue"), so users can
   contribute to _other_ open-source projects.
7. **Project learning path (levels 1–3 first).**
8. **Provenance:** source badge, tier, last-verified on every fact.
9. **Basic interview mode:** user answers first; feedback grounded in sources.
10. **UX:** loading, empty, error, stale and partial states on every page.

### P2

**Deep PR intelligence (D-011):** changed-file analysis, review analysis,
contribution-specific PR analysis, root-cause analysis, and interview
generation from a user's own PR ("Your Contribution"). Also issue
intelligence; personalized recommendations; readiness checklist; timeline;
learning levels 4–6; Tier 2 project sources.

### P3

Accounts and personal workspace; forecasting; notifications; ecosystem graph
visualization; mentor tools.

### Later

More programs and ecosystems (other LF ecosystems, Outreachy), vector
retrieval if justified, a separate API service if evidence demands it.

## 5. Functional requirements (MVP)

- FR1 Program pages list orgs/projects per year with source and freshness.
- FR2 A project page shows program history, repo evidence, contribution
  guide, learning path; each fact shows provenance state.
- FR3 Analyze endpoint accepts only github.com repo URLs; results are cached
  and show "last verified".
- FR4 Search across projects by name, tech tag, language, program.
- FR5 Roles are distinguished: contributor, reviewer, merger, maintainer,
  official mentor. Only sources that assert a role may label it.
- FR6 Interview: session of questions; user answers before any reference
  material is shown; evaluation cites evidence; inferences are labeled.
- FR7 Recommendations show transparent matching criteria with sources; no
  numeric match score is ever shown (D-010, RECOMMENDATION_ENGINE.md).
- FR8 Every participation fact states its granularity. GSoC copy reads
  "Organization participated in GSoC 2025"; project-level GSoC claims
  appear only when separately verified with provenance, otherwise
  "Project-level GSoC participation: not verified".
- FR9 CNCF data is labeled "CNCF projects only" and never presented as all
  of LFX Mentorship.
- FR10 Contact data (emails, LFIDs) is never shown or stored (DATA_POLICY).

## 5a. Product model vs product purpose

OpenSourceX is a proprietary product and repository and does not accept
external code contributions (D-006, D-012). Its **purpose** is to help users
understand and contribute to _other_ open-source projects. These are
different things: the first is about this repository, the second is the core
product feature.

## 5b. GSoC data limits (D-007)

Current authoritative GSoC data is organization-per-year. Project-level and
mentor-level GSoC data are **not verified** and must be shown as such; they
are never inferred. If reliable project-level evidence exists in another
authoritative source it may be attached separately with its own provenance.
Ideas listed by an ecosystem (e.g. CNCF's GSoC idea files) are proposals,
not proof of participation.

## 5c. Automatic updates

Data is refreshed by the worker on per-source cadences with incremental
sync, retries, failed-source isolation and historical preservation
(INGESTION_PIPELINE.md). Users see last-verified dates; stale data is
labeled.

## 6. Non-functional

Accessibility WCAG 2.2 AA target; responsive to phone width; p95 page read
under 500 ms from cache; ingestion respects source rate limits; secure by
default (SECURITY_ARCHITECTURE.md).

## 7. Data, AI, security, technical

See DATA_MODEL.md, DATA_PROVENANCE.md, DATA_POLICY.md,
INGESTION_PIPELINE.md, ENTITY_RESOLUTION.md, AI_ARCHITECTURE.md,
SECURITY_ARCHITECTURE.md, ARCHITECTURE.md, API_SPECIFICATION.md,
TRACEABILITY.md.

## 8. UX

See UI_UX_SPECIFICATION.md and DESIGN_SYSTEM.md.

## 9. Metrics

Activation (first repo analyzed or project viewed); analyses per user;
discovery-to-guide click-through; recommendation engagement; interview
sessions completed; 30-day retention; % facts fresh (<30 days); source
fetch success rate; conflict rate.

## 10. Risks

Undocumented program endpoints may change or be restricted (mitigation:
snapshots, adapters, monitoring, ToS review); GitHub rate limits; LLM
hallucination (mitigation: grounding + validation); prompt injection via
repo content.
