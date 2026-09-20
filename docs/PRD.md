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
1. **Program intelligence:** GSoC orgs by year, LFX projects and terms.
2. **GitHub repository intelligence:** analyze a public repo by URL:
   metadata, languages, contributors, issues/PRs, releases, contribution docs.
3. **Project discovery:** search and filter by language, technology, program.
4. **Historical participation:** per-project grid of years/terms.
5. **Activity analysis:** evidence table (commits, PRs, issues, releases),
   no single score.
6. **Contribution guidance:** CONTRIBUTING/setup/labels ("good first issue").
7. **Project learning path (levels 1–3 first).**
8. **Provenance:** source badge, tier, last-verified on every fact.
9. **Basic interview mode:** user answers first; feedback grounded in sources.
10. **UX:** loading, empty, error, stale and partial states on every page.

### P2
Issue and PR intelligence; contribution explainer ("Your Contribution");
"Why this project?" personalization; readiness checklist; timeline;
learning levels 4–6; Tier 2 org sources.
### P3
Accounts and personal workspace; forecasting; notifications; ecosystem graph
visualization; mentor tools.
### Later
More programs (Outreachy, CNCF and others), vector retrieval if justified.

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
- FR7 Recommendations explain each match with checkable reasons.

## 6. Non-functional
Accessibility WCAG 2.2 AA target; responsive to phone width; p95 page read
under 500 ms from cache; ingestion respects source rate limits; secure by
default (SECURITY_ARCHITECTURE.md).

## 7. Data, AI, security, technical
See DATA_MODEL.md, DATA_PROVENANCE.md, AI_ARCHITECTURE.md,
SECURITY_ARCHITECTURE.md, ARCHITECTURE.md, API_SPECIFICATION.md.

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
