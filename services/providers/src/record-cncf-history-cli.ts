/**
 * Records the CNCF LFX Mentorship history fixture from a LOCAL clone of
 * https://github.com/cncf/mentoring. It reads files only, sanitizes immediately and writes
 * only the sanitized envelope; raw README text is never written. Not for CI or production.
 *
 * Usage: tsx services/providers/src/record-cncf-history-cli.ts <path-to-cncf-mentoring-clone>
 */
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fixtureFile } from "./provider";
import { SANITIZER_VERSION, type SnapshotEnvelope } from "./types";
import { buildCncfHistory, type CncfHistoryBody, type TermFile } from "./cncf-history";

const clone = process.argv[2];
if (!clone) throw new Error("usage: record-cncf-history <path-to-cncf-mentoring-clone>");
const root = path.join(clone, "programs", "lfx-mentorship");
const commit = execFileSync("git", ["-C", clone, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const committedAt = execFileSync("git", ["-C", clone, "log", "-1", "--format=%cI"], {
  encoding: "utf8",
}).trim();

const isDir = async (p: string) => (await stat(p)).isDirectory();
const TERM_FILES = /^(readme|selected_projects)\.md$/i;

async function termFiles(year: number, dir: string, folder: string): Promise<TermFile[]> {
  const out: TermFile[] = [];
  for (const f of (await readdir(dir)).filter((n) => TERM_FILES.test(n))) {
    const rel = path.posix.join(
      "programs/lfx-mentorship",
      String(year),
      folder === String(year) ? "" : folder,
      f,
    );
    out.push({ year, folder, path: rel, markdown: await readFile(path.join(dir, f), "utf8") });
  }
  return out;
}

const terms: TermFile[][] = [];
for (const y of (await readdir(root)).filter((n) => /^\d{4}$/.test(n)).sort()) {
  const year = Number(y);
  const ydir = path.join(root, y);
  const subs = [];
  for (const n of await readdir(ydir)) if (await isDir(path.join(ydir, n))) subs.push(n);
  if (!subs.length) terms.push(await termFiles(year, ydir, y));
  for (const s of subs.sort()) {
    const files = await termFiles(year, path.join(ydir, s), s);
    if (files.length) terms.push(files);
  }
}

const body: CncfHistoryBody = buildCncfHistory(commit, terms);
const env: SnapshotEnvelope<CncfHistoryBody> = {
  provider: "cncf-mentoring",
  dataset: "cncf-lfx-history",
  url: `https://github.com/cncf/mentoring/tree/${commit}/programs/lfx-mentorship`,
  fetchedAt: new Date(committedAt).toISOString(),
  origin: "recorded",
  sourceRef: commit,
  schemaVersion: SANITIZER_VERSION,
  body,
};
await writeFile(fixtureFile("cncf-lfx-history.json"), JSON.stringify(env, null, 2) + "\n");
const programs = body.terms.reduce((n, t) => n + t.programs.length, 0);
console.log(`recorded ${body.terms.length} terms, ${programs} programs at ${commit.slice(0, 7)}`);
for (const t of body.terms)
  console.log(
    `${t.label.padEnd(26)} programs=${String(t.programs.length).padStart(3)} timeline=${t.timeline.length} ${t.startsOn ?? "?"}..${t.endsOn ?? "?"}`,
  );
