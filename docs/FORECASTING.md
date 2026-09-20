# Forecasting

Status: P3, not in MVP.

## Rules
- A forecast is never a fact. UI wording: "No official {year} announcement
  has been verified. Historical participation suggests this project may be
  worth monitoring."
- Inputs: participation history (years/terms), recency, gaps, whether the
  program has announced the current year's organizations.
- Model: transparent rules first (e.g. participated in N of last M years).
  No ML until enough data and evaluation exist.
- Output: label (Monitor / Weak signal), inputs listed, confidence with
  reason, `FORECAST` status, generated date.
- Limits: past participation does not guarantee future; org acceptance is
  decided by the program.
- Freshness: forecasts expire when the program publishes official lists.

## Signals available from sources (verified 2026-09-21)
- GSoC exposes program metadata per year (`phase`, milestone dates such as
  org application and announcement dates). This is the strongest signal for
  "has the program officially announced this year's organizations?"
  Use is subject to DATA_POLICY approval (source is `pending`).
- CNCF term READMEs give dated timelines and, once published, the selected
  projects. Term status comes from dates, not README status text.
- GSoC history is organization-level, so a GSoC forecast is about an
  **organization**, never a specific project (D-007).
- CNCF idea files are proposals, not participation, and are not forecast
  inputs for participation.
