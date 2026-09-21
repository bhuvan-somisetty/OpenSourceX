import { PgBoss } from "pg-boss";
import { createLogger, loadEnv, requireDatabaseUrl } from "@opensourcex/shared";

const env = loadEnv();
const log = createLogger("worker", env.LOG_LEVEL);

/**
 * Worker foundation (docs/ARCHITECTURE.md section 4). Job handlers for ingestion,
 * repository analysis and freshness are added in later milestones. Live source
 * fetching stays off unless INGESTION_LIVE_SOURCES=true and the provider is approved.
 */
const HEARTBEAT = "system.heartbeat";

async function main() {
  const boss = new PgBoss(requireDatabaseUrl(env));
  boss.on("error", (e) => log.error({ err: e.message }, "queue error"));
  await boss.start();
  await boss.createQueue(HEARTBEAT);
  await boss.work(HEARTBEAT, async () => {
    log.info("heartbeat");
  });
  await boss.schedule(HEARTBEAT, "*/5 * * * *");
  log.info({ liveSources: env.INGESTION_LIVE_SOURCES }, "worker started");

  const stop = async (signal: string) => {
    log.info({ signal }, "shutting down");
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((e) => {
  log.fatal({ err: e instanceof Error ? e.message : "unknown" }, "worker failed to start");
  process.exit(1);
});
