# Entity Resolution

Applies to: organizations, projects, repositories, people (mentors),
programs, terms. Never rely on name equality alone.

## Vocabulary caution

An **LFX project** is a _mentorship project_ (an offering such as
"CNCF - Jaeger: OpenTelemetry-Native Query and State Layers Migration"),
not an OpenSourceX Project. It has a UUID, one or more terms and a
`repoLink`. It is resolved to an upstream **Project** and **Repository**.
CNCF `project_ideas` and GSoC ideas are likewise _ideas_, not proof of
participation.

## Stable identifiers (preferred, in order)

| Entity             | Identifiers                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Repository         | GitHub repository id (`id`, `node_id`); canonical URL is secondary because repositories rename and move |
| Organization       | GitHub organization id; GSoC org slug per year; CNCF project slug                                       |
| Mentorship project | LFX project UUID (verified as the join key between the LFX API and CNCF `lfx_url`)                      |
| Program / term     | official program ids and dated terms (TERM section of INGESTION_PIPELINE)                               |
| Person             | GitHub user id (login is mutable)                                                                       |

## Method

1. **Exact stable-id match** wins and is CONFIRMED.
2. **Deterministic links** next: a URL that resolves via the GitHub API to
   a repo/org id; a redirect target (renamed or moved repository); LFX UUID
   found in a CNCF `lfx_url`.
3. **Corroboration.** Two or more independent weak signals (website domain,
   `source_code` URL, GitHub org, normalized name, description) can create
   an INFERRED link with recorded reasons.
4. **Ambiguous** results are not merged; they enter a review queue and show
   as "unlinked" in the UI.
5. **Every link stores** method, evidence, confidence level and source.
6. **Manual overrides** are first-class rows with reviewer, date and reason,
   and are re-applied on every sync.
7. **Splits and merges are reversible.** Links are rows; undoing a merge
   never loses history.

## Cases to handle

- **Renamed / moved repository:** track by GitHub id; keep
  `repository_name_history`; old URLs resolve.
- **Org-only links** (78 of 1,301 LFX repoLinks are organization URLs):
  link to the organization; do not guess a repository.
- **Non-GitHub or empty links** (61): remain unlinked with a stated reason.
- **Organization aliases:** `organization_alias` with source and dates
  (e.g. rebrands, GSoC display names vs GitHub org).
- **Duplicate project records:** merge only via stable ids or corroborated
  evidence; keep both source records attached.
- **Historical names:** old names stay searchable and shown as "formerly".
- **Mentors:** match by GitHub handle then resolve to GitHub user id; a
  name without a handle stays a name-only, unlinked person. Never match on
  email (we do not store it).
- **Same repo, several programs and years:** one Repository, many
  participation rows.

## Output states

LINKED (CONFIRMED), LINKED (INFERRED with reasons), AMBIGUOUS (review),
UNLINKED (reason). The UI shows the state and evidence; it never presents an
inferred link as confirmed.

## Tests

Golden cases from real recorded data: renamed repos, org-only links, LFX
UUID joins (33 of 59 verified for CNCF 2026 Term 3), duplicate ideas.
