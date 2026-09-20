# Design System

- **Type:** Inter (UI), JetBrains Mono (code/ids). Scale 12/14/16/20/24/32/48.
- **Spacing:** 4px base (4, 8, 12, 16, 24, 32, 48, 64).
- **Layout:** 12 columns, max width 1200px; 16px mobile gutter.
- **Color tokens (CSS variables, light and dark):** bg, surface, surface-2,
  border, text, text-muted, accent, success, warning, danger, info. Status
  colors never carry meaning alone (icon + label).
- **Surfaces/borders:** 1px borders, subtle elevation, 8px radius.
- **Components:** button (primary/secondary/ghost), input, tabs, badge,
  source badge, status chip, card, data table, timeline, participation grid,
  skeleton, empty state, error state, stale banner.
- **Motion:** 150-200ms, disabled under `prefers-reduced-motion`.
- **Charts:** colorblind-safe, directly labeled, with a table alternative.
