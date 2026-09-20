# Operations (draft, planned)

- Sync schedules per source; failed jobs retry with backoff, then alert.
- Data past its freshness window flips to STALE automatically.
- Watch GitHub limits via `x-ratelimit-remaining`; back off on 403/429.
- On a source outage keep the last snapshot and mark data stale.
- Daily database backups with periodic restore tests.
- Structured logs and metrics; incidents get a written post-mortem.
