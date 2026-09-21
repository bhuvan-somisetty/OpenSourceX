# Design System

Status: **proposal for owner approval (Q22).** Nothing here is built into the
app yet. A browsable preview is `docs/design/preview.html` (layout samples
only; its values are placeholders, not real data).

## 1. Direction: "the evidence atlas"

OpenSourceX should feel like a precise instrument for reading an ecosystem:
dark-first, calm, dense where experts need it, and never a database dump.
Three signature ideas carry the identity:

1. **The source rail.** Every fact ends in a quiet right-aligned rail: a
   tier dot, source name, "verified 2026-09-21", and a status glyph. Trust is
   visible everywhere, not hidden in a tooltip.
2. **The term ribbon.** History is a grid of years by terms with status
   glyphs, so participation reads as a shape, not a list.
3. **The ecosystem spine.** A breadcrumb-like path (Program › Ecosystem ›
   Organization › Project › Repository) that is also navigation, so users
   always know where they are in the ecosystem.

Not decorative: gradients and glow are used only to mark the single primary
action and the current focus. No stock illustrations, no fake charts.

## 2. Tokens

Defined as CSS variables. Dark is the default; light is a full theme, not an
inversion. Contrast targets are WCAG 2.2 AA (4.5:1 text, 3:1 UI).

| Token             | Dark      | Light     | Use                          |
| ----------------- | --------- | --------- | ---------------------------- |
| `--bg`            | `#0a0c11` | `#f7f8fa` | page                         |
| `--surface`       | `#10131a` | `#ffffff` | cards, panels                |
| `--surface-2`     | `#161a23` | `#f0f2f6` | inset, table stripes         |
| `--border`        | `#252b39` | `#dde1ea` | 1px lines                    |
| `--border-strong` | `#353d50` | `#c3c9d6` | inputs, focus rings base     |
| `--text`          | `#e8ebf2` | `#12151c` | primary text                 |
| `--text-muted`    | `#a0a9bc` | `#4d5668` | secondary text               |
| `--accent`        | `#8b9bff` | `#3d4fd6` | primary action, links, focus |
| `--accent-ink`    | `#0a0c11` | `#ffffff` | text on accent               |

Provenance status colors always ship with an icon and a text label, never
color alone:

| Status      | Dark      | Light     | Glyph | Meaning (DATA_PROVENANCE.md) |
| ----------- | --------- | --------- | ----- | ---------------------------- |
| Confirmed   | `#4ade9a` | `#0f7a4a` | ✓     | stated by a Tier 1-3 source  |
| Historical  | `#8fb0ff` | `#2955b8` | ◷     | true for a past period       |
| Inferred    | `#f6c453` | `#8a5a00` | ≈     | derived; inputs shown        |
| Forecast    | `#c4a1ff` | `#6b3fc4` | ↗     | prediction, never a fact     |
| Unknown     | `#8b93a6` | `#5a6274` | ?     | "Not verified"               |
| Stale       | `#ff9d5c` | `#a34a00` | ⏱     | "May be outdated" (derived)  |
| Conflicting | `#ff7a95` | `#b3204a` | ⇄     | sources disagree; all shown  |

Tier dots (source authority): T1 solid accent, T2 accent ring, T3 half,
T4 and T5 muted. The legend is always one click away.

## 3. Typography

- UI: `Inter`, falling back to `ui-sans-serif, system-ui`. Code, ids, SHAs,
  term codes: `JetBrains Mono`, falling back to `ui-monospace`.
- Scale (px / line-height): 12/16 caption, 14/20 body-sm, 16/24 body,
  20/28 h4, 24/32 h3, 32/40 h2, 48/52 h1 (hero 56/60 on desktop).
- Weights 400, 500, 600. Tabular numerals for all counts and dates.
- Line length capped at 72ch for prose.

## 4. Space, layout, shape

- 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Container max 1200px; 12 columns; 16px gutter on phones, 24px tablets,
  32px desktop. Two-column detail pages use 8 + 4 with a sticky right rail.
- Radius 8px (controls 6px, chips 999px). Borders 1px. Elevation is a border
  plus a soft shadow only on overlays.
- Breakpoints: 480, 768, 1024, 1280.

## 5. Components

| Component               | Rules                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                  | primary (accent fill), secondary (border), ghost. 40px min height, 44px touch target on mobile. Loading state keeps width and shows a spinner plus label |
| Input / Select / Search | visible label, hint, error text with icon; never placeholder-only labels. Global search is `/`                                                           |
| Tabs                    | keyboard arrows, `aria-selected`; on phones a scrollable segmented control                                                                               |
| Source badge            | tier dot + name + date, links to the exact source URL                                                                                                    |
| Status chip             | glyph + label + color; optional "why" popover with rule and inputs                                                                                       |
| Fact row                | label, value, source rail; conflicts render side by side                                                                                                 |
| Participation grid      | years x terms; each cell glyph + status; row header states granularity ("Organization" or "Project"); table alternative for screen readers               |
| Evidence table          | dimension, label (Recent / Moderate / Low / None), window, raw count, tiny sparkline; no aggregate score (D-004)                                         |
| Match criteria list     | check / dash / question lines with sources; no numeric match (D-010)                                                                                     |
| Timeline                | horizontal on desktop, vertical on phones; every event has a source and date; no unsourced events                                                        |
| Learning trail          | vertical levels with state (locked, current, done) and concrete tasks                                                                                    |
| Interview panel         | question, answer field, evidence-cited feedback, gaps list                                                                                               |
| Skeleton                | matches the final layout; shimmer off under reduced motion                                                                                               |
| Empty state             | says why it is empty and offers one next step                                                                                                            |
| Error state             | what failed, what still works, retry and source-status link                                                                                              |
| Stale banner            | "May be outdated. Last verified {date}." with refresh where allowed                                                                                      |
| Partial banner          | "Showing available data. {X} is not yet connected."                                                                                                      |
| Toast                   | only for user-initiated results; never for errors that block                                                                                             |

## 6. Motion

150 to 200 ms ease-out for state changes; 240 ms for panels. Motion explains
(a row expands, a chip changes state), never decorates. Everything respects
`prefers-reduced-motion` (no shimmer, no transforms, instant state).

## 7. Accessibility rules

Semantic landmarks; one `h1` per page; skip link; visible 2px focus ring
(accent, offset 2px) on every interactive element; full keyboard operation;
status never by color alone; charts have a data table; forms link errors with
`aria-describedby`; live regions announce loading and results; target size
44px on touch; text resizes to 200% without loss.

## 8. Performance budget

LCP under 2.5 s on a mid-range phone over 4G; JS under 170 kB gzipped for the
landing route; no layout shift from skeletons; fonts `swap`; images lazy with
dimensions; charts are SVG rendered on the server where possible.

## 9. Content rules

Plain language first, terms second ("Organization participated in GSoC 2025",
not "org-year participation"). Every claim answers "where did this come from?"
in one glance. Unknowns are stated: "Not verified", "Could not be verified".
No hype, no fabricated urgency, no numeric match scores.
