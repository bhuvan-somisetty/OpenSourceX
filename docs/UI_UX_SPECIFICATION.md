# UI/UX Specification

Status: **proposal for owner approval (Q22).** Tokens and components are in
DESIGN_SYSTEM.md; a browsable preview is `docs/design/preview.html`.

## 1. Principles

1. Every screen answers one question. No database dumps.
2. Trust is visible: every fact shows source, tier, verified date, status.
3. Say what is unknown. Never fill a gap with a guess.
4. Progressive depth: beginner summary first, expert detail one click down.
5. Understand, not pretend: learning and interview features build real
   understanding (product rule 56).

## 2. Audiences and the five checks

| Audience              | Check                                 | How the design answers it                                                 |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| Beginner              | "Can I understand what this means?"   | plain-language summary line on every page, glossary chips, learning trail |
| Experienced developer | "Can I reach the technical detail?"   | evidence table, raw counts, links to source, keyboard search `/`          |
| Contributor           | "Can I understand how to contribute?" | Contribute tab: setup, docs, labels, first-issue links                    |
| Applicant             | "Can I prepare for an interview?"     | Interview tab with project-specific questions                             |
| Trust-conscious       | "Can I verify where this came from?"  | source rail, exact source links, conflicts shown                          |

## 3. Information architecture

```
/                       Landing
/explore                Discover projects (search, filters)
/programs               Programs
/programs/[slug]        Program: ecosystems, years/terms, history grid
/programs/[slug]/[year] Year or term: participants
/projects/[id]          Project (tabs below)
/analyze                Analyze a repository by URL
/analyze/[id]           Analysis result
/interview/[id]         Interview session
/sources                Source registry: tiers, status, freshness, licences
/about/data             How data is verified (plain language)
```

Project tabs: **Overview**, **History** (term ribbon), **Activity**
(evidence), **Community**, **Contribute**, **Learn**, **Interview**.

Global chrome: top bar with logo, search (`/`), Explore, Programs, Analyze,
Sources; theme toggle; footer with data-policy and attribution links.

## 4. Landing

Headline "Understand Open Source. Find the Right Projects. Contribute With
Confidence." Sub-line states the promise in one sentence. Four actions:
**Start Exploring**, **Analyze a Repository**, **Explore Programs**,
**Practice Interview**. Below: three proof panels (source rail, term ribbon,
match criteria) drawn with real component states, then "How we verify"
(tiers, freshness, no scores). No fake statistics; counts appear only from
real ingested data, otherwise the section is absent.

## 5. Key screens

### Project page

- **Header:** ecosystem spine, project name, one-line plain summary, status
  chips (Confirmed, Stale...), primary action **Start the learning path**.
- **Overview:** what it is, who uses it (sourced), languages, technologies,
  links (each with source rail).
- **History:** term ribbon (years x terms). Rows: "LFX Mentorship (CNCF
  projects only)" at project grain; "Google Summer of Code" at organization
  grain with the granularity label. Ideas shown as "Proposed idea".
- **Activity:** evidence table (Commits, PRs, Issues, Releases,
  Contributors) with label, window, raw count, sparkline; basic PR metadata
  and links (D-011). A sentence explains what each label means.
- **Community:** channels (chat, forum, lists) from sources; governance and
  code-of-conduct presence; roles with the contributor / reviewer / merger /
  maintainer / official mentor distinction and "Mentor not verified" when so.
- **Contribute:** the target project's own contribution docs, setup steps,
  first-issue labels, "what to understand first" links.
- **Learn:** learning trail (levels 1-3 in MVP): understand the project,
  understand architecture, understand contribution workflow; each level has
  concrete reading tasks and a self-check.
- **Interview:** project-specific questions; user answers first.

### Program page

Ecosystems and coverage note, the term ribbon for the program, participants
per year with granularity label, milestone dates (when available), source
rail for every block.

### Analyze

URL field (GitHub URLs only, inline validation), progress stepper (fetching
metadata, contributors, activity, docs), result opens the project-style
page. Rate-limit and queue messages are explicit.

### Explore and recommendations

Search with filters (language, technology, program, year, activity label).
Result cards show "Why this matches" as check / dash lines with sources and
"Not verified" lines; ordering is explained in one sentence and can be
switched (best match by your criteria, recently active, A to Z). No numeric
match score (D-010).

### Interview

Question, answer box, submit; then feedback: covered points, missed points,
evidence links, inferences labeled. Sessions are anonymous and expire.

### Sources page

Table of providers: tier, program, ecosystem, coverage, ingestion status
(pending / approved / blocked), licence and attribution, last successful
sync. Makes the trust model transparent.

## 6. Granularity and coverage copy (D-007, D-013)

- GSoC: "Organization participated in GSoC 2025". Never "Project X
  participated in GSoC 2025" unless a verified project-level record exists;
  otherwise "Project-level GSoC participation: not verified".
- LFX / CNCF: "Project mentored in LFX 2026 Term 3 (CNCF)". Ecosystem data
  carries a visible "CNCF projects only" label and is never shown as all of
  LFX Mentorship.
- Ideas are "Proposed idea", not participation.
- Mentors: name and public GitHub handle with role and term; otherwise
  "Mentor not verified". Contact data is never shown.
- Attribution: CNCF-derived content shows "Source: CNCF mentoring
  repository, CC BY 4.0" with links, and notes when content was summarized.
- Every participation cell shows source badge, last verified and status.

## 7. States (every data page)

| State       | Behavior                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Loading     | skeleton in final layout; progress text for long jobs ("Fetching contributors, 3 of 5")                                      |
| Empty       | why it is empty + one next step ("No participation found. This does not mean none exists; only verified records are shown.") |
| Error       | what failed, what still works, retry, link to source status                                                                  |
| Stale       | banner "May be outdated. Last verified {date}"; values still shown, chips show Stale                                         |
| Partial     | banner "Showing available data. {X} is not yet connected."                                                                   |
| Conflicting | values side by side with sources; never silently picked                                                                      |
| Blocked     | "Data source not yet connected." (used while ingestion is pending)                                                           |

## 8. Responsive behavior

Mobile first. Phones: single column, sticky bottom action bar for the primary
action, tabs become a scrollable segmented control, tables become stacked
rows, the term ribbon scrolls horizontally with a sticky row header and a
list alternative. Tablets: two columns without the right rail. Desktop:
8 + 4 columns with the sticky source and legend rail.

## 9. Accessibility

See DESIGN_SYSTEM.md section 7. Additional rules: the term ribbon and
evidence table are real tables with headers; every visualization has a text
equivalent; error summaries move focus; long jobs use live regions.

## 10. Visualizations (only what aids understanding)

Term ribbon (history), evidence table with sparklines (activity), learning
trail (progress), ecosystem spine (context). Timeline and ecosystem graph
arrive in Phase 2 and 3 with source-backed events only.

## 11. Acceptance criteria for approval

Owner approves: visual direction, palette and type, landing hero, project
page structure, states, granularity copy. Approval is a gate for M4 (web).
