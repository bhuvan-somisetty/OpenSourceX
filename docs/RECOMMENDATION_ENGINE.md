# Recommendation Design

Resolves Q11 (D-010). Recommendations are **transparent matching**, not a
score.

## Rules
- **No numeric match score.** Never show "87/100" or a percentage, and never
  imply a universal objective ranking.
- **Show criteria.** Each result lists the criteria it meets and, equally,
  the ones it does not or cannot verify.
- **Every criterion is evidence-backed**, links to its source and shows its
  provenance state and last-verified date.
- **Unknown stays unknown.** "Recent repository activity: could not be
  verified" is shown instead of assumed.

## Result presentation
```
WHY THIS PROJECT MATCHES
 ✓ Go matches your selected language          [GitHub, verified 2026-..]
 ✓ Kubernetes matches your technology         [project tags, Tier ..]
 ✓ Historical LFX participation found         [CNCF mentoring, 2025 T2]
 ✓ Recent repository activity                 [GitHub, last 90 days]
 ✓ Contribution documentation available       [CONTRIBUTING.md found]
NOT VERIFIED
 - Current-year program participation
```
(Illustrative layout only; real entries come from stored evidence.)

## Matching criteria (MVP)
Language match, technology match, program/history match (with grain stated:
organization-level vs project-level), repository activity evidence,
contribution documentation present, beginner-friendly labels present,
community channels documented.

## Ordering
- Filter first: candidates must satisfy the user's hard filters.
- Then order by an **internal relevance strategy**: a documented, rule-based
  ordering (e.g. more of the user's selected criteria met first; ties broken
  by data freshness, then name for stability). It has no user-facing number.
- The strategy is written down here and explained on demand in the UI
  ("Results are ordered by how many of your selected criteria are met, then
  by data freshness"). It is not presented as universal quality.
- Users can switch to alphabetical or "recently active" ordering.
- The ordering and criteria set are versioned and tested with golden cases.

## Guardrails
- Never claim a future program participation; use FORECASTING.md wording.
- Do not recommend from data older than its freshness window without a
  stale marker.
- AI may phrase explanations but only from the criteria list; it cannot add
  criteria (AI_ARCHITECTURE.md).
- Personalization uses only what the user enters in the session in the MVP.
