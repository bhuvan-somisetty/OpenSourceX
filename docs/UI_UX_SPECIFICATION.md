# UI/UX Specification

## Feel
Precise, technical, calm. Dense where experts need it, guided where beginners
do. Never a database dump: every screen answers a question.

## Landing
Headline: "Understand Open Source. Find the Right Projects. Contribute With
Confidence." Actions: Start Exploring, Analyze a Repository, Explore
Programs, Practice Interview.

## Pages
- **Discover:** search, filters (language, tech, program, year), result cards
  with participation chips and freshness.
- **Program:** years/terms, participants, history grid.
- **Project:** header with sources; tabs: Overview, Program history,
  Activity evidence, Community, Contribute, Learn, Interview.
- **Repository analysis:** progress states while fetching; evidence table.
- **Learning path:** levels 1-3 (MVP), each with concrete reading tasks.
- **Interview:** question, answer box, evidence-cited feedback.

## Visualizations (only where they aid understanding)
Participation grid (years x terms), activity evidence table with windows.
Timelines and the ecosystem graph come later.

## States (every page)
- Loading: skeletons matching the layout.
- Empty: explains why and offers a next step.
- Error: explains the problem with a recovery path (retry, source status).
- Stale: banner "May be outdated".
- Partial: "Showing available data; X not yet connected."

## Trust UI
Source badge with tier, "Last verified" date, status chip (Confirmed,
Inferred, Conflicting, ...). Conflicts are shown side by side.

## Accessibility
Semantic landmarks, keyboard-first, visible focus, AA contrast, labeled
forms with inline errors, reduced-motion support, tables as the accessible
form of any chart.

## Responsive
Mobile first; tabs become a scrollable segmented control; tables become
stacked rows.

## Granularity and coverage copy (D-007, D-013)
- GSoC: "Organization participated in GSoC 2025". Never "Project X
  participated in GSoC 2025" unless a verified project-level row exists.
  Otherwise: "Project-level GSoC participation: not verified".
- LFX/CNCF: "Project mentored in LFX 2026 Term 3 (CNCF)". Ecosystem data
  carries a visible "CNCF projects only" label and is never shown as all of
  LFX Mentorship.
- Ideas are shown as "Proposed idea", not as participation.
- Mentors: name and public GitHub handle with role and term; if not
  verified, say "Mentor not verified". Never show contact data.
- Attribution: CNCF-derived content shows "Source: CNCF mentoring
  repository, CC BY 4.0" with links.
- Every participation cell shows source badge, last verified, and status.
