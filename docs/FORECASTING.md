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
