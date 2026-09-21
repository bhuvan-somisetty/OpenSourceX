# Roadmap

Nothing below is implemented yet. See IMPLEMENTATION_PLAN.md.

## MVP

Prove: a person can discover or analyze an open-source project using real,
source-backed data and understand how to begin contributing.

- Program intelligence: GSoC organization-by-year, LFX terms and projects,
  CNCF-LFX mentors and selections (CNCF projects only, labeled as such);
  each ingestion path only after DATA_POLICY approval.
- GitHub repository intelligence and activity **evidence**, including basic
  PR metadata: PR count, recent PR activity, merged-PR activity, and links
  to relevant PRs where available (D-011).
- Project discovery, historical participation with explicit granularity.
- Contribution guidance, learning path levels 1-3, basic interview mode.
- Provenance, freshness and automatic updates.
- Premium UI/UX with all states, after the design phase.

## Phase 2

- Deep PR intelligence: changed-file analysis, review analysis,
  contribution-specific PR analysis, root-cause analysis, and interview
  generation from a user's own PR ("Your Contribution").
- Issue intelligence, personalized recommendations, readiness checklist,
  project timeline, learning levels 4-6, Tier 2 project sources.

## Phase 3

Accounts and personal workspace, forecasting, notifications, ecosystem graph
visualization, mentor tools.

## Later

Additional programs and ecosystems (other LF ecosystems, Outreachy),
vector retrieval if justified, separate API service if evidence demands it.
