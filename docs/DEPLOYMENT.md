# Deployment (draft, planned)

Web on a Next.js host; API and worker as containers; managed Postgres with
backups. Secrets come from the platform secret store. Migrations run before
release; rollback means redeploying the previous image and fixing forward on
migrations. Monitoring: health endpoint, job-failure alerts, freshness
dashboard. Nothing here is deployed yet.
