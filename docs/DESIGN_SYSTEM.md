# Design System

Status: **implemented** in `apps/web/styles/globals.css`.

## Direction: cinematic, editorial, restrained

Deep near-black canvas, soft ambient light, very large tight-tracked
typography, translucent surfaces with hairline borders, generous whitespace,
one electric blue-violet accent. Inspired by the visual quality of premium
product sites (dark environment, vertical light beams, minimal navigation,
pill controls) without copying any brand, text, layout or asset. Cards are
used only where information needs a container; lists, rows and open layouts
carry the rest.

## Tokens

| Token                                    | Dark                              | Light (app only)                  |
| ---------------------------------------- | --------------------------------- | --------------------------------- |
| `--bg`                                   | `#05070c`                         | `#f6f7fa`                         |
| `--surface` / `--surface-2`              | `#0b0e15` / `#10141d`             | `#ffffff` / `#eef0f5`             |
| `--glass` / `--glass-2`                  | white 3.5% / 6%                   | ink 3.5% / 6%                     |
| `--border` / `--border-strong`           | white 8% / 16%                    | ink 9% / 20%                      |
| `--text` / `--text-muted` / `--text-dim` | `#f2f4f8` / `#9aa3b5` / `#6c7588` | `#0d1117` / `#4d5668` / `#7a8496` |
| `--accent` / `--accent-2`                | `#7d9bff` / `#9b7dff`             | `#3d4fd6` / `#6a3fd6`             |
| Primary button                           | `#eef3fb` on near-black text      | near-black on white               |

Status colors stay secondary and always come with a glyph and label:
confirmed green, historical blue, recorded cyan, development/inferred amber,
stale orange, forecast purple, conflicting red. Public pages are forced dark
with `.scope-dark`.

## Typography

System stack led by Inter. Display up to 88px at -0.045em; page titles up to
56px; strong hierarchy (display, h1, h2, body, metadata). Monospace only for
repository URLs, technologies, term codes and identifiers.

## Components

Button (pill; primary, default, sm, lg), segmented control, chips and tags,
StatusChip, SourceBadge and SourcePanel, ProgramMark (typographic; no
logos), ProjectCard, ProjectRow, program tile, SaveButton, TermRibbon,
empty state, notice, skeleton, profile menu, mobile menu, hero beams,
auth card. Feature code lives in `apps/web/features/*`; primitives in
`apps/web/components/*`.

## Motion and accessibility

Beams drift at 46s; hover and save transitions 200-300ms; view transitions
between pages. `prefers-reduced-motion` disables all animation. 44px touch
targets on phones, AA contrast, visible 2px focus ring.
