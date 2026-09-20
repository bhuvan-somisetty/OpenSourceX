# Security Architecture

- **SSRF:** analyze accepts only `https://github.com/{owner}/{repo}`, parsed
  and rebuilt by us; fetches go through fixed API hosts; ingestion adapters
  use allow-listed hosts; block private/link-local IPs and redirects to
  them; timeouts and size caps.
- **Prompt injection:** see AI_ARCHITECTURE.md trust boundaries.
- **Secrets:** environment variables only; `.env` ignored; no secrets in
  logs; secret scanning in CI.
- **AuthN/Z:** MVP is read-only and anonymous; interview sessions use
  unguessable ids. Accounts (P3) use a standard provider with least
  privilege.
- **Input validation:** zod on every endpoint; length limits on answers.
- **Rate limiting:** per IP, stricter for analyze and interview endpoints.
- **Dependencies/supply chain:** lockfile, dependency audit and update bot,
  minimal dependencies, pinned CI actions.
- **Untrusted content:** rendered as escaped text or sanitized markdown;
  no raw HTML from repos.
- **Logging/privacy:** no answers or PII in logs; short retention for
  interview data.
- **External integrations:** identifiable User-Agent, respect rate limits
  and terms, keep raw snapshots.

## Privacy and data minimization (Q15, Q16)
Full policy: DATA_POLICY.md. Security requirements derived from it:
- Contact data (emails, LFIDs, phone numbers) is never stored, indexed,
  embedded, logged, exposed or exported. Enforced by allowlist parsers,
  no persistence of raw bodies, an email/LFID scrubber, a schema guard test
  and planted-PII fixtures.
- Logs and analytics contain ids and counts only.
- AI context is built from stored sanitized data only.
- Contributor and mentor data must never be offered for recruiting or bulk
  export (GitHub API terms).

## Ingestion safety
Providers stay `pending` until terms, robots, licence and attribution are
documented and approved (DATA_POLICY.md). Fetchers use an identifiable
User-Agent, rate budgets, host allow-lists, timeouts and size caps, and
respect `robots.txt` and source terms.

## Quota abuse (H-7)
The GitHub token budget is reserved first for scheduled sync; user-triggered
analysis uses a separate capped share with per-IP limits, per-repository
cooldown and caching. LLM endpoints have per-IP and global spend caps.
Exact numbers are set in M3/M5.
