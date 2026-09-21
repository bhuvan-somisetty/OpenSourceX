# Ingestion and Automatic Update Pipeline

Status: design. No source is approved for production ingestion yet
(DATA_POLICY.md section 2).

## 1. Pipeline

```
source -> discover -> fetch -> validate -> sanitize -> normalize
       -> resolve entities -> deduplicate -> compare -> persist
       -> record provenance -> update freshness -> expose
```

| Stage             | Responsibility                                                                                               | Failure handling                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| discover          | List what exists (years, terms, pages, repos) using provider logic                                           | log, retry, mark source degraded                                    |
| fetch             | Polite HTTP: identifiable User-Agent, rate limit, ETag/If-Modified-Since, timeout, size cap, host allow-list | retry with backoff; honor `retry-after`; circuit breaker per source |
| validate          | Schema check against the provider's expected shape; detect schema drift                                      | quarantine the batch, alert, keep last good data                    |
| sanitize          | Allowlist fields, drop email/LFID/contact data, scrub free text                                              | fail closed: unknown shape means quarantine                         |
| normalize         | Canonicalize terms, URLs, names, technologies (sections 3-4)                                                 | keep raw value; flag unmapped                                       |
| resolve entities  | Link to organizations, projects, repositories, people (ENTITY_RESOLUTION.md)                                 | low confidence stays INFERRED; ambiguous goes to a review queue     |
| deduplicate       | Merge duplicate records by stable identifiers                                                                | never merge on name equality alone                                  |
| compare           | Diff against stored state: new, unchanged, changed, missing                                                  | record each change as a revision                                    |
| persist           | Transactional upsert of typed rows plus provenance                                                           | all-or-nothing per batch                                            |
| record provenance | Link rows to snapshot and provenance record                                                                  | required; a row without provenance is rejected                      |
| update freshness  | Set `last_verified_at` for confirmed-unchanged and updated rows                                              | a failed fetch does not refresh freshness                           |
| expose            | Caches and read models update; UI reads freshness                                                            | stale data is labeled, never hidden                                 |

## 2. Guarantees

- **Incremental sync.** Cursors and conditional requests; a full re-crawl is
  a scheduled backstop, not the default.
- **Failed-source isolation.** One provider failing never blocks another;
  each has its own queue, rate budget and circuit breaker.
- **Historical preservation.** Changes never overwrite history. A changed
  attribute creates an `entity_revision` and closes the old validity range;
  a participation record is superseded by status, not deleted.
- **Missing is not deleted.** If a record disappears upstream it becomes
  `MISSING_UPSTREAM` with a date; historical participation is kept.
- **Idempotency.** Re-running a batch yields the same state (content hashes).
- **Schema and source change.** Parsers are versioned; drift is quarantined
  and alerted, never guessed through.
- **Rate limits.** Per-provider budgets; GitHub budget is shared and
  reserved for scheduled sync before user-triggered analysis (SECURITY).
- **Stale data.** Each dataset has a freshness policy; past it, reads show
  STALE and a refresh is scheduled.
- **Observability.** `sync_run` records counts, duration, errors per run.

## 3. LFX and CNCF term normalization

Findings (research, not permanent truth): 151 term-name spellings across
1,301 LFX API projects; CNCF folder names vary by year (`q1`, `q3-q4`,
`01-Spring`, `03-Sept-Nov`, `03-Sep-Nov`, `01-Mar-May`).

**Do not map by string matching.** The layer:

1. **Inputs (evidence, in priority order):** (a) start/end timestamps from
   the LFX API `programTerms`; (b) year and term number parsed from the text;
   (c) CNCF directory path (`2026/03-Sep-Nov`); (d) LFX project UUID and
   term id; (e) the raw name as a hint only.
2. **Canonical term:** `program`, `year`, `term_code` (T1/T2/T3, or Q1 Q2
   Q3Q4 for legacy, or season for legacy), `track` (full-time/part-time
   when stated), `starts_on`, `ends_on`.
3. **Rules first.** Dates decide: a term that starts in Mar-May and lasts
   about three months is T1, etc. Legacy calendars (Spring/Summer/Fall, Q1,
   Q2) map through an explicit, reviewed table.
4. **Alias table.** Every distinct raw spelling is stored as a `term_alias`
   pointing to a canonical term with `method` (date, parsed, manual) and
   `confidence`.
5. **Unmapped or contradictory** (dates disagree with the name) is stored
   as UNKNOWN or CONFLICTING and shown as such; never coerced.
6. **Future terms** (e.g. one LFX term starts in 2027) are `upcoming`, not
   participation.
7. **Provenance:** the canonical term keeps `raw_name`, source, snapshot and
   method.
8. **Testing:** golden fixtures from recorded real data, including the odd
   spellings.

Term status (`upcoming`, `in_progress`, `completed`) is **derived from
dates**. Source status text (e.g. a README "Status: Planning") never
overrides it; disagreement is recorded as a conflict.

## 4. Provider architecture

```
Program: LFX Mentorship
 |- Ecosystem: CNCF         -> provider: cncf-mentoring (GitHub repo)
 |- Ecosystem: other LF     -> providers: future
 '- Official LFX source     -> provider: lfx-mentorship-api (pending)
Program: Google Summer of Code
 '- provider: gsoc-archive (organization/year), other providers future
```

A provider is a module implementing `discover`, `fetch`, `sanitize`,
`parse`, plus metadata: program, ecosystem, coverage (`full`, `ecosystem`,
`partial`), tier, licence, terms status, cadence, rate budget. The CNCF
provider covers CNCF projects only and its data must be labeled as such; it
must never be presented as complete LFX Mentorship coverage. Adding an
ecosystem means adding a provider, not changing the core.

## 5. Cadence (initial proposals)

| Source                                                                     | Discovery                           | Refresh       |
| -------------------------------------------------------------------------- | ----------------------------------- | ------------- |
| GSoC program metadata and orgs                                             | daily in season, weekly otherwise   | on change     |
| LFX API                                                                    | daily                               | daily         |
| CNCF mentoring repo                                                        | daily (conditional requests)        | on new commit |
| GitHub repo activity                                                       | on demand + daily for tracked repos | 24 h TTL      |
| All cadences are tunable and subject to each source's approval and limits. |

## 6. Failure and quarantine

Batch fails validation -> quarantined -> last good data stays visible with
its true `last_verified_at` -> alert. A human reviews quarantines and the
entity-resolution review queue.
