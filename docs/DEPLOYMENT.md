# Deployment (draft, planned)

Next.js application (UI and Route Handlers) on a Next.js host; the worker
as a long-running container (a serverless host cannot run it); managed
Postgres with backups. No separate API service in the MVP (D-009). Secrets come from the platform secret store. Migrations run before
release; rollback means redeploying the previous image and fixing forward on
migrations. Monitoring: health endpoint, job-failure alerts, freshness
dashboard. Nothing here is deployed yet.
