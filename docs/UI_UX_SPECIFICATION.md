# UI/UX Specification

Status: **redesigned 2026-09-21 and implemented** (the earlier dashboard-style
UI was not approved). This document describes what the product experience is.

## 1. The product journey

```
Landing -> Login -> Choose a program -> Explore that program's projects
        -> Understand a project -> Save it -> Saved workspace
        -> Analyze -> Learn -> Contribute -> Explain (interview)
```

OpenSourceX should feel like a premium product that helps you navigate the
open-source ecosystem, not a website that displays data. Every screen
reinforces that journey.

## 2. Two shells

| Shell                               | Routes                                                                                                                                         | Purpose                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public** (always dark, cinematic) | `/`, `/login`                                                                                                                                  | Explain and sell the product. Minimal navigation: Product, Programs, How it works, About, Sign in. No catalog, no app navigation.                  |
| **Application** (dark or light)     | `/app`, `/discover`, `/programs`, `/programs/[id]`, `/projects`, `/projects/[id]`, `/saved`, `/repositories/analyze`, `/interview`, `/sources` | Use the product. Requires a session. Navigation: Discover, Programs, Projects, Saved, Repositories, Interview; search, theme toggle, profile menu. |

Sources and provenance are not primary navigation. They are reached from
every fact's source rail, program and project pages, the profile menu and the footer.

## 3. Public landing (`/`)

Hero with vertical light beams, large editorial headline ("Understand open
source. Find where you belong."), one-sentence promise, "Get Started" and
"Explore Open Source". Then: one place to navigate open source (four
editorial rows: Discover, Understand, Contribute, Prepare), programs (only
programs with recorded data are marked available; configured programs with
no data are labeled "no data yet"), the journey, evidence ("every important
fact should have a source", drawn as a Fact -> Source -> Evidence -> Status
chain from real recorded data), final call to action, minimal footer.

## 4. Login (`/login`)

Google, GitHub and email are shown but **disabled and labeled** as not
connected: no fake OAuth. The only working path is "Continue in Development
Mode", labeled development-only. It creates a local development session (an
HttpOnly cookie) so saved items persist; it is not an authenticated identity
and is refused in production. The session layer (`lib/auth.ts`) is the single
place real authentication replaces later.

## 5. Application home (`/app`)

"What are you exploring today?", search, choose a program, continue exploring
(from saved items; no fake "recently viewed"), recommended next steps.

## 6. Programs

`/programs`: "Where do you want to contribute?" Tiles for programs that have
data; a separate quiet "Configured, no data yet" group for the rest (typographic
marks only, no invented logos). Programs are configuration
(`lib/programs.ts`), so any future program uses the same model.
`/programs/[id]` (slug or alias): a dedicated ecosystem with Projects (or
Organizations), Technologies and History tabs, search and filters limited to
what the data supports, the CNCF-only or organization-level granularity
notice, and sources.

## 7. Discover vs Projects (deliberately different)

|         | Discover                                                                                                                         | Projects                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Purpose | "Help me figure out what to explore."                                                                                            | "What projects exist?"                       |
| Entry   | Choose interests (from real recorded tags), optional program                                                                     | Search, program, technology, year/term, sort |
| Result  | Matching projects as cards with **Why this appears** (checked and unverified reasons); ordered by how many interests are covered | A dense sortable list                        |
| Empty   | "Start with an interest"                                                                                                         | "No projects match these filters"            |

No numeric score anywhere. Experience level is shown disabled because no
source records difficulty.

## 8. Program filter drives the data

`?program=gsoc`, `?program=lfx` (aliases resolve to database slugs) change
the actual query, are shareable URL state, and work for any configured
program. A program with no data returns an honest empty state, never invented rows.

## 9. Save and the Saved workspace

Users save **projects, organizations and repositories**. The save control
(bookmark, optimistic, animated, `aria-pressed`) calls `POST/DELETE
/api/v1/saved` and persists in PostgreSQL (`saved_item`, unique per user,
type and entity). `/saved` shows a summary, type tabs (All, Projects,
Repositories, Organizations), program filter, and groups by program, with
unsave in place and a designed empty state. Program is derived server-side,
never trusted from the client.

## 10. Project detail (intelligence profile)

Hero: program mark, program and term, project name, status chips, Save, Open
repository, Save repository. Sections: overview, program history (term ribbon
and source spelling), technologies, repository, mentors (name, public GitHub
handle, role only), contribution, sources. Provenance is preserved everywhere.

## 11. Repository analyzer and interview

Analyzer: "Understand any open source repository." Validates a GitHub URL
(never fetched), offers save, checks the recorded sample, and states plainly
that live analysis is not enabled. Interview: choose project and mode
(Project understanding, Contribution available; PR review, Technical,
Architecture disabled), answer first, development feedback that says it is
not AI.

## 12. Status and provenance presentation

Provenance remains, but quieter: a compact source rail on cards, source
panels on detail pages, status chips with glyph and label (never color
alone), a persistent development banner in the app. Vocabulary unchanged
(Confirmed, Historical, Recorded, Development, Inferred, Unknown, Stale,
Forecast, Conflicting).

## 13. States

Loading skeletons, designed empty states (saved, no matches, no program data,
choose an interest), error page, not-found page, database-down notice,
"Live repository analysis is not available in this development build."

## 14. Responsive behavior

Verified at 320, 360, 390, 768, 1024, 1280 and 1440px on every route.
Phones: hamburger menu with search, wordmark collapses to the logo mark below
420px, tables become labeled rows, filters stack, catalog rows wrap.

## 15. Motion

Slow drifting beams on the public pages; card and button hover, save
animation, view transitions between pages, theme cross-fade. Everything
respects `prefers-reduced-motion` (all animation and transitions off).

## 16. Accessibility

Skip link, landmarks, one h1 per page, keyboard operation, visible focus,
`aria-pressed` on toggles, `aria-current` on navigation, labeled form
controls, live regions for save errors and analysis results, status never by
color alone, disabled controls explained in text.
