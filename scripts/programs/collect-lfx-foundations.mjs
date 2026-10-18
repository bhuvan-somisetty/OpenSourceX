// Builds apps/web/data/programs/lfx-foundations.json: every LFX Mentorship project outside CNCF,
// grouped by the Linux Foundation project it belongs to (LF Decentralized Trust, RISC-V, ...).
//
// Sources:
//   1. the LFX Mentorship platform's public project list
//      (api.mentorship.lfx.linuxfoundation.org/projects): the project, its parent LF project
//      (`lfProjectName`), skills, terms and repository link;
//   2. the GitHub account in each project's own repository link, for the organization's name,
//      description, website and avatar. A repository owned by a personal account is not an
//      organization, so those projects are grouped under their LF project instead.
// CNCF projects are left out: the CNCF tab already shows them from the CNCF mentoring repository.
// Mentor names are not stored.
//
// Usage: node scripts/programs/collect-lfx-foundations.mjs
// Needs a GitHub token (GITHUB_TOKEN, or a logged-in `gh`).

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "apps/web/data/programs/lfx-foundations.json");
const API = "https://api.mentorship.lfx.linuxfoundation.org/projects";
const UA = "OpenSourceX-collector/1.0 (+https://opensource-x.vercel.app)";
const TOKEN = process.env.GITHUB_TOKEN || execSync("gh auth token").toString().trim();
const TODAY = new Date().toISOString().slice(0, 10);

/** Foundations with their own switch; every other non-CNCF LF project goes under "more". */
const FOUNDATIONS = [
  { key: "lfdt", short: "LFDT", name: "LF Decentralized Trust", match: ["LF Decentralized Trust"] },
  { key: "riscv", short: "RISC-V", name: "RISC-V International", match: ["RISC-V International"] },
  {
    key: "omp",
    short: "Open Mainframe",
    name: "Open Mainframe Project",
    match: ["Open Mainframe Project (OMP)"],
  },
  {
    key: "kernel",
    short: "Linux Kernel",
    name: "The Linux Kernel Organization",
    match: ["The Linux Kernel Organization"],
  },
  { key: "sonic", short: "SONiC", name: "SONiC Foundation", match: ["SONiC Foundation"] },
  { key: "lfn", short: "LF Networking", name: "LF Networking", match: ["LF Networking (LFN)"] },
];
const MORE = { key: "more", short: "More", name: "More Linux Foundation projects" };
const CNCF = "Cloud Native Computing Foundation (CNCF)";

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
const uniqCI = (xs) => {
  const seen = new Map();
  for (const x of xs) {
    const t = String(x ?? "").trim();
    if (t && t.length <= 40 && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return [...seen.values()];
};

async function getJson(url, headers = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error(`failed: ${url}`);
}

async function allProjects() {
  const out = [];
  let key = null;
  do {
    const d = await getJson(
      `${API}?pageSize=100${key ? `&nextPageKey=${encodeURIComponent(key)}` : ""}`,
    );
    out.push(...(d?.projects ?? []));
    key = d?.nextPageKey || null;
  } while (key);
  return out;
}

const ghCache = new Map();
async function githubAccount(login) {
  if (ghCache.has(login)) return ghCache.get(login);
  const u = await getJson(`https://api.github.com/users/${login}`, {
    authorization: `Bearer ${TOKEN}`,
    accept: "application/vnd.github+json",
  });
  let acct = null;
  if (u && u.type === "Organization") {
    const o = await getJson(`https://api.github.com/orgs/${login}`, {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/vnd.github+json",
    });
    acct = {
      login: u.login,
      name: (o?.name || u.name || u.login).trim(),
      description: o?.description?.trim() || null,
      website: o?.blog ? (/^https?:\/\//.test(o.blog) ? o.blog : `https://${o.blog}`) : null,
      avatar: o?.avatar_url || u.avatar_url ? `${o?.avatar_url || u.avatar_url}&s=160` : null,
    };
  }
  ghCache.set(login, acct);
  return acct;
}

const githubOwner = (url) => {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)/i.exec(url ?? "");
  return m && !["orgs", "sponsors", "features"].includes(m[1].toLowerCase()) ? m[1] : null;
};

/** "Summer FT" + 2025-06-01 -> { year: 2025, label: "2025 Summer" } */
function termOf(t) {
  // startDateTime is Unix seconds; createdOn is "YYYY-MM-DD hh:mm:ss +0000"
  const start =
    typeof t.startDateTime === "number" && t.startDateTime > 0
      ? new Date(t.startDateTime * 1000)
      : t.createdOn
        ? new Date(String(t.createdOn).replace(" ", "T").replace(" +0000", "Z"))
        : null;
  const year = start && !Number.isNaN(start.getTime()) ? start.getUTCFullYear() : null;
  const season = /spring/i.test(t.name)
    ? "Spring"
    : /summer/i.test(t.name)
      ? "Summer"
      : /fall|autumn/i.test(t.name)
        ? "Fall"
        : null;
  return { year, label: year ? `${year}${season ? ` ${season}` : ""}` : null };
}

const projects = (await allProjects()).filter(
  (p) => p.status === "Published" && p.lfProjectName && p.lfProjectName !== CNCF,
);
console.log(`non-CNCF published projects: ${projects.length}`);

const foundationOf = (lfName) => FOUNDATIONS.find((f) => f.match.includes(lfName)) ?? MORE;
const groups = new Map(); // `${foundation}|${orgKey}` -> group

for (const p of projects) {
  const f = foundationOf(p.lfProjectName);
  const owner = githubOwner(p.repoLink);
  const acct = owner ? await githubAccount(owner) : null;
  const orgKey = acct ? `gh:${acct.login.toLowerCase()}` : `lf:${p.lfProjectName}`;
  const id = `${f.key}|${orgKey}`;
  let g = groups.get(id);
  if (!g) {
    const name = acct ? acct.name : p.lfProjectName;
    g = {
      foundation: f.key,
      slug: `${f.key}-${slugify(acct ? acct.login : p.lfProjectName)}`,
      name,
      lfProject: p.lfProjectName,
      description: acct?.description ?? null,
      website: acct?.website ?? null,
      githubUrl: acct ? `https://github.com/${acct.login}` : null,
      logo: acct?.avatar ?? (p.lfProjectLogo || null),
      tags: [],
      years: new Set(),
      terms: new Set(),
      projects: [],
    };
    groups.set(id, g);
  }
  const terms = (p.programTerms ?? []).map(termOf);
  for (const t of terms) {
    if (t.year) g.years.add(t.year);
    if (t.label) g.terms.add(t.label);
  }
  g.tags.push(...(p.apprenticeNeeds?.skills ?? []), ...String(p.industry ?? "").split(","));
  const latest = terms.filter((t) => t.year).sort((a, b) => b.year - a.year)[0];
  g.projects.push({
    year: latest?.year ?? null,
    term: latest?.label ?? null,
    title: p.name.trim(),
    url: `https://mentorship.lfx.linuxfoundation.org/project/${p.projectId}`,
    repoUrl: p.repoLink || null,
  });
}

const orgs = [...groups.values()].map((g) => {
  const years = [...g.years].sort();
  const tags = uniqCI(g.tags).slice(0, 24);
  const repo = g.projects.find((x) => githubOwner(x.repoUrl))?.repoUrl ?? null;
  return {
    foundation: g.foundation,
    slug: g.slug,
    name: g.name,
    tagline: null,
    description: g.description,
    website: g.website,
    repoUrl: g.githubUrl ?? repo,
    githubUrl: g.githubUrl,
    logo: g.logo,
    tags,
    categories: [FOUNDATIONS.find((f) => f.key === g.foundation)?.name ?? g.lfProject],
    years,
    rounds: [...g.terms].sort(),
    projects: g.projects.sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
    ),
    links: [{ label: "LFX Mentorship listing", url: g.projects[0].url }],
    chats: [],
    lfProject: g.lfProject,
    sourceUrl: API,
  };
});

const foundations = [...FOUNDATIONS, MORE].map(({ key, short, name }) => {
  const list = orgs
    .filter((o) => o.foundation === key)
    .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  return {
    key,
    short,
    name,
    orgCount: list.length,
    projectCount: list.reduce((n, o) => n + o.projects.length, 0),
    years: [...new Set(list.flatMap((o) => o.years))].sort(),
    orgs: list,
  };
});

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: TODAY,
      note: "LFX Mentorship projects outside CNCF, from the LFX Mentorship platform's public project list.",
      sources: [
        { label: "LFX Mentorship public project list", url: API },
        { label: "LFX Mentorship", url: "https://mentorship.lfx.linuxfoundation.org/" },
      ],
      foundations,
    },
    null,
    1,
  ) + "\n",
);
for (const f of foundations)
  console.log(`${f.key}: ${f.orgCount} orgs, ${f.projectCount} projects`);
