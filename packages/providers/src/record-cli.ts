/**
 * One-off recorder for local fixtures (M1a). Fetches a very small sample of public data,
 * sanitizes it IMMEDIATELY, and writes only the sanitized envelope. Raw bodies are never
 * written to disk. This is local read-only research, not ingestion: live ingestion of
 * GSoC, LFX and CNCF stays pending (docs/DATA_POLICY.md). Do not run in CI or production.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SANITIZER_VERSION, type SnapshotEnvelope } from "./types";
import { sanitizeCncfExport, type CncfExportBody } from "./cncf";
import { sanitizeLfxProject, type LfxProjectsBody } from "./lfx";
import { sanitizeGsocOrg, type GsocOrgsBody } from "./gsoc";

const UA = { "User-Agent": "OpenSourceX-local-research (read-only, low volume)" };
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const get = async (url: string) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
};
const save = (name: string, env: SnapshotEnvelope) =>
  writeFile(path.join(OUT, name), JSON.stringify(env, null, 2) + "\n");

await mkdir(OUT, { recursive: true });
const now = new Date().toISOString();

// CNCF: first 3 programs of the 2026 Term 3 export that also exist in the LFX API.
const cncfPath = "programs/lfx-mentorship/2026/03-Sep-Nov/lfx-export.json";
const commit = (
  (await get("https://api.github.com/repos/cncf/mentoring/commits/main")) as { sha: string }
).sha;
const rawExport = (await get(
  `https://raw.githubusercontent.com/cncf/mentoring/${commit}/${cncfPath}`,
)) as {
  programs: Record<string, unknown>[];
};
const picked: Record<string, unknown>[] = [];
const lfxRaw: unknown[] = [];
for (const p of rawExport.programs) {
  if (picked.length === 3) break;
  const m = String(p.lfx_url ?? "").match(/project\/([0-9a-f-]{36})/i);
  if (!m) continue;
  try {
    lfxRaw.push(await get(`https://api.mentorship.lfx.linuxfoundation.org/projects/${m[1]}`));
    picked.push(p);
  } catch {
    /* not in LFX API yet: skip */
  }
}
const cncfBody: CncfExportBody = sanitizeCncfExport({ ...rawExport, programs: picked });
await save("cncf-lfx-export-2026-t3.json", {
  provider: "cncf-mentoring",
  dataset: "cncf-lfx-export",
  url: `https://github.com/cncf/mentoring/blob/${commit}/${cncfPath}`,
  fetchedAt: now,
  origin: "recorded",
  sourceRef: commit,
  schemaVersion: SANITIZER_VERSION,
  body: cncfBody,
});
const lfxBody: LfxProjectsBody = { projects: lfxRaw.map(sanitizeLfxProject) };
await save("lfx-projects-sample.json", {
  provider: "lfx-mentorship-api",
  dataset: "lfx-projects",
  url: "https://api.mentorship.lfx.linuxfoundation.org/projects/{projectId}",
  fetchedAt: now,
  origin: "recorded",
  schemaVersion: SANITIZER_VERSION,
  body: lfxBody,
});

// GSoC: three organizations from 2025 (organization/year granularity only).
const orgs = (await get(
  "https://summerofcode.withgoogle.com/api/program/2025/organizations/",
)) as Record<string, unknown>[];
const gsocBody: GsocOrgsBody = { year: 2025, orgs: orgs.slice(0, 3).map(sanitizeGsocOrg) };
await save("gsoc-2025-orgs-sample.json", {
  provider: "gsoc-archive",
  dataset: "gsoc-orgs",
  url: "https://summerofcode.withgoogle.com/api/program/2025/organizations/",
  fetchedAt: now,
  origin: "recorded",
  schemaVersion: SANITIZER_VERSION,
  body: gsocBody,
});
console.log(
  `recorded: ${picked.length} CNCF programs, ${lfxBody.projects.length} LFX projects, ${gsocBody.orgs.length} GSoC orgs`,
);
