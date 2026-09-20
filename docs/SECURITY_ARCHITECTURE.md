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
