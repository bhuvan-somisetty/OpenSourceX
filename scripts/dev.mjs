// One command for local development: database -> migrate -> seed recorded data -> worker + web.
// Live sources stay off (DATA_MODE=recorded). Usage: pnpm dev
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const isWin = process.platform === "win32";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";

// load .env (simple KEY=VALUE) without a dependency
const env = { ...process.env };
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && env[m[1]] === undefined) env[m[1]] = m[2];
  }
}
env.DATABASE_URL ||= "postgres://osx:osx_dev_password@localhost:5433/opensourcex";
env.DATA_MODE = "recorded";
env.INGESTION_LIVE_SOURCES = "false";
env.AI_ENABLED = "false";
const PORT = env.PORT || "3001";

function step(label, cmd, args) {
  console.log(`\n[dev] ${label}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: isWin });
  if (r.status !== 0) {
    console.error(`\n[dev] FAILED: ${label}`);
    if (label.startsWith("database"))
      console.error("[dev] Is Docker running? Start Docker Desktop and retry.");
    process.exit(r.status ?? 1);
  }
}

step("database: starting PostgreSQL (docker compose)", "docker", [
  "compose",
  "up",
  "-d",
  "--wait",
  "db",
]);
step("database: running migrations", pnpm, ["db:migrate"]);
step("data: loading sanitized recorded snapshots (no network)", pnpm, ["db:seed"]);

const procs = [
  spawn(pnpm, ["--filter", "@opensourcex/worker", "start"], {
    stdio: "inherit",
    env,
    shell: isWin,
  }),
  spawn(pnpm, ["--filter", "@opensourcex/web", "exec", "next", "dev", "-p", PORT], {
    stdio: "inherit",
    env,
    shell: isWin,
  }),
];
console.log(`\n[dev] OpenSourceX web:  http://localhost:${PORT}`);
console.log(`[dev] Health check:     http://localhost:${PORT}/api/v1/health`);
console.log("[dev] Worker: running (live ingestion OFF). Press Ctrl+C to stop.\n");

const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", () => stop()));
