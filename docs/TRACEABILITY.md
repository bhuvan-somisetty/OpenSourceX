# Requirement Traceability

Source of truth: the complete OpenSourceX handoff/master prompt plus this
repository's documents (Q7 resolved 2026-09-21). Status: **Specified**
(designed in docs), **Deferred** (phase recorded), **Open** (needs owner
decision or work). Nothing is implemented yet.

| # | Requirement | Where | Phase | Status |
|---|-------------|-------|-------|--------|
| 1 | Program intelligence | PRD 4, DATA_SOURCES, INGESTION_PIPELINE | MVP | Specified; production ingestion pending permission |
| 2 | GSoC history, organization/year | DATA_MODEL 3, PRD | MVP | Specified; grain limit documented; project/mentor level "Not verified" |
| 3 | LFX Mentorship and term-level history | DATA_MODEL 2,4, INGESTION 3 | MVP | Specified |
| 4 | CNCF mentors and selected projects (CNCF only) | DATA_SOURCES 4, provider model | MVP | Specified; sanitizer required |
| 5 | Historical participation | DATA_MODEL, PROVENANCE | MVP | Specified |
| 6 | GitHub repository intelligence (metadata, languages, contributors, issues, PRs, releases, labels, discussions, docs, governance, CoC, maintainers) | PRD 4, DATA_MODEL 5 | MVP | Specified; discussions and governance files listed in PRD |
| 7 | Role distinction: contributor, reviewer, merger, maintainer, official mentor | DATA_MODEL `person_role` | MVP | Specified |
| 8 | Project and activity analysis (evidence, no score) | TECHNICAL_DESIGN, D-004 | MVP | Specified |
| 9 | Basic PR metadata and activity | PRD, D-011 | MVP | Specified |
| 10 | Recommendations, transparent | RECOMMENDATION_ENGINE | MVP (session criteria) | Specified |
| 11 | "Why this project?" explanations | RECOMMENDATION_ENGINE | MVP | Specified |
| 12 | Community intelligence (channels, GSoC comm links, docs, discussions) | DATA_MODEL `community_channel`, PRD | MVP | Specified |
| 13 | Contribution guidance | PRD | MVP | Specified |
| 14 | Project learning path | PRD, UI | MVP L1-3, P2 L4-6 | Specified |
| 15 | Deep PR/contribution understanding | CONTRIBUTION_INTELLIGENCE, D-011 | Phase 2 | Deferred (owner decision) |
| 16 | Interview preparation (user answers first, grounded) | INTERVIEW_SYSTEM | MVP basic; P2 contribution questions | Specified |
| 17 | Source provenance | DATA_PROVENANCE | MVP | Specified |
| 18 | Freshness | DATA_PROVENANCE | MVP | Specified |
| 19 | Confirmed/historical/inferred/forecast | DATA_PROVENANCE, FORECASTING | MVP states; forecast P3 | Specified |
| 20 | Automatic updates | INGESTION_PIPELINE | MVP | Specified |
| 21 | Real data only, no fakes | DATA_POLICY, all docs | always | Specified |
| 22 | Source hierarchy | DATA_PROVENANCE | MVP | Specified |
| 23 | Forecasting with careful wording | FORECASTING | Phase 3 | Deferred |
| 24 | AI grounding, evidence-first, injection defense | AI_ARCHITECTURE, SECURITY | MVP | Specified; spend caps and tests still to define (H-7) |
| 25 | Security architecture | SECURITY_ARCHITECTURE | MVP | Specified |
| 26 | Privacy and third-party content | DATA_POLICY | MVP | Specified |
| 27 | Premium UI/UX, design system, states, accessibility, responsive | UI_UX_SPECIFICATION, DESIGN_SYSTEM | MVP | **Open**: needs a design phase with concrete tokens and wireframes (H-6) |
| 28 | Ecosystem graph | ROADMAP | Phase 3 | Deferred |
| 29 | Project timeline | ROADMAP | Phase 2 | Deferred |
| 30 | Contribution readiness (explainable) | ROADMAP | Phase 2 | Deferred |
| 31 | Personal workspace | ROADMAP | Phase 3 | Deferred |
| 32 | Notifications | ROADMAP | Phase 3 | Deferred |
| 33 | Contributor journey engine | PRD (learning path + recommendations + interview) | MVP subset, grows in P2 | Specified as composition |
| 34 | Data model entities from the prompt (Program, ProgramYear, ProgramTerm, Organization, Project, Repository, Language, Technology, Participation, Person, PersonRole, CommunityChannel, Issue, PullRequest, Commit, Source, provenance, Forecast, User, UserSkill, InterviewSession, InterviewQuestion) | DATA_MODEL | MVP / P3 | Specified (Source and Fact replaced by typed source/provenance tables, D-008) |
| 35 | API design | API_SPECIFICATION | MVP | Specified |
| 36 | CI, testing (unit, integration, AI, E2E) | IMPLEMENTATION_PLAN | M0+ | Specified |
| 37 | Development, deployment, operations docs | DEVELOPMENT, DEPLOYMENT, OPERATIONS | - | Specified (draft) |
| 38 | No AI attribution, proprietary product | DECISIONS D-006 | always | Done and audited |
| 39 | Proprietary vs helping users contribute elsewhere | PRD, D-006 | always | Specified |

Prompt items intentionally not carried over because of the proprietary model
(D-006, D-012): LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md. Prompt items
still to produce: `.github` workflows (M0), design tokens and wireframes
(design phase).
