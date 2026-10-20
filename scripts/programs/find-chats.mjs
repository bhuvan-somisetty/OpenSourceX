// Fills community links (Slack, Discord, Matrix, Zulip, IRC, forums, ...) for every program
// organization that still has none, in apps/web/data/programs/<program>.json and
// apps/web/data/programs/lfx-foundations.json.
//
// collect.mjs only reads an organization's main README and homepage. This pass looks further,
// and only at places the organization itself publishes:
//   1. the repository's README, CONTRIBUTING, COMMUNITY and SUPPORT files;
//   2. the GitHub account's .github repository (profile README, CONTRIBUTING, SUPPORT);
//   3. the README of the account's most-starred repositories (its own projects);
//   4. the organization's website: the homepage and its own community / contact / get-involved
//      pages linked from it;
//   5. GitHub Discussions on the organization's own repository, when it is switched on.
// A Discord invite must still be live and its server name, or a Slack workspace's name, must match
// the organization; links that fail this are written to the review file instead, never applied.
//
// Run it after collect.mjs or collect-lfx-foundations.mjs, which start chats from scratch.
// Usage: node scripts/programs/find-chats.mjs [program ...]
// Needs a GitHub token (GITHUB_TOKEN, or a logged-in `gh`).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "apps/web/data/programs");
const CACHE = path.join(os.tmpdir(), "opensourcex-collect-cache");
const REVIEW = path.join(os.tmpdir(), "opensourcex-chat-review.json");
const UA = "OpenSourceX-collector/1.0 (+https://opensource-x.vercel.app)";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const TOKEN = process.env.GITHUB_TOKEN || execSync("gh auth token").toString().trim();
const GH_HEAD = { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json" };
const GH_RAW = { ...GH_HEAD, accept: "application/vnd.github.raw" };

fs.mkdirSync(CACHE, { recursive: true });

// ---------- fetching ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cacheKey = (...parts) =>
  path.join(CACHE, crypto.createHash("sha1").update(parts.join("|")).digest("hex"));

/** GET with timeout, retry and the collector's on-disk cache. Returns text or null. */
async function fetchText(url, { headers = {}, timeout = 20000, cache = true } = {}) {
  const key = cacheKey("GET", url, "");
  if (cache && fs.existsSync(key)) {
    const v = fs.readFileSync(key, "utf8");
    return v === "\u0000" ? null : v;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": /api\.github\.com|discord\.com\/api/.test(url) ? UA : BROWSER_UA,
          ...headers,
        },
        signal: AbortSignal.timeout(timeout),
        redirect: "follow",
      });
      if (res.status === 404 || res.status === 410) {
        if (cache) fs.writeFileSync(key, "\u0000");
        return null;
      }
      if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        const after = Number(res.headers.get("retry-after"));
        const wait = after
          ? after * 1000 + 500
          : reset
            ? Math.max(1000, reset * 1000 - Date.now() + 1000)
            : 15000 * (attempt + 1);
        if (wait < 15 * 60 * 1000) {
          await sleep(wait);
          continue;
        }
        return null;
      }
      if (!res.ok) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      const text = await res.text();
      if (cache) fs.writeFileSync(key, text);
      return text;
    } catch {
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}
const fetchJson = async (url, opts) => {
  const t = await fetchText(url, opts);
  try {
    return t == null ? null : JSON.parse(t);
  } catch {
    return null;
  }
};
const gh = (p) => fetchJson(`https://api.github.com/${p}`, { headers: GH_HEAD });
const ghFile = (owner, repo, file) =>
  fetchText(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, { headers: GH_RAW });
const ghReadme = (owner, repo) =>
  fetchText(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: GH_RAW });

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

// ---------- names ----------

const STOP = new Set(
  "the and for project projects foundation community open source org organization organisation inc labs team official software group network dev".split(
    " ",
  ),
);
const tokensOf = (...xs) => [
  ...new Set(
    xs
      .flatMap((x) =>
        (x ?? "")
          .toLowerCase()
          .normalize("NFKD")
          .split(/[^a-z0-9]+/),
      )
      .filter((t) => t.length >= 3 && !STOP.has(t)),
  ),
];
const squash = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** A chat name (Discord server, Slack workspace) that is plainly this organization's. */
function related(name, tokens) {
  const n = squash(name);
  if (!n) return false;
  return tokens.some((t) => n.includes(t) || (n.length >= 4 && t.includes(n)));
}

function parseGithub(url) {
  const orgs = (url ?? "").match(/^https?:\/\/(?:www\.)?github\.com\/orgs\/([A-Za-z0-9_.-]+)/i);
  if (orgs) return { owner: orgs[1], repo: null };
  const m = (url ?? "").match(
    /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i,
  );
  if (!m) return null;
  const repo =
    m[2] && !/^(issues|pulls|wiki|discussions|blob|tree)$/i.test(m[2])
      ? m[2].replace(/\.git$/, "")
      : null;
  return { owner: m[1], repo };
}
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};
/** example.org from docs.example.org; good enough to tell an organization's own pages apart. */
const baseDomain = (h) => {
  if (!h) return null;
  const p = h.split(".");
  const two = /^(co|com|org|ac|gov|net|edu)\.[a-z]{2}$/.test(p.slice(-2).join("."));
  return p.slice(two ? -3 : -2).join(".");
};

// ---------- recognising chat links ----------

const END = `[^\\s"'<>)\\]\`|]`;
const CHAT_RE = [
  [
    "discord",
    /https?:\/\/(?:(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[A-Za-z0-9-]+|discord\.[a-z0-9-]+\.[a-z]{2,}(?:\/[A-Za-z0-9-]*)?)/gi,
  ],
  [
    "slack",
    new RegExp(
      `https?:\\/\\/(?:join\\.slack\\.com\\/t\\/${END}+|[a-z0-9-]+\\.slack\\.com\\/?${END}*|slack\\.[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.[a-z]{2,}\\/?${END}*)`,
      "gi",
    ),
  ],
  [
    "zulip",
    new RegExp(`https?:\\/\\/(?:[a-z0-9-]+\\.zulipchat\\.com|chat\\.zulip\\.org)\\/?${END}*`, "gi"),
  ],
  ["matrix", new RegExp(`https?:\\/\\/matrix\\.to\\/#\\/${END}+`, "gi")],
  ["gitter", new RegExp(`https?:\\/\\/(?:app\\.)?gitter\\.im\\/${END}+`, "gi")],
  ["telegram", /https?:\/\/t\.me\/[A-Za-z0-9_+]+/gi],
  [
    "irc",
    new RegExp(
      `(?:https?:\\/\\/(?:web\\.libera\\.chat|webchat\\.oftc\\.net|kiwiirc\\.com\\/nextclient)${END}*|ircs?:\\/\\/[a-z0-9.-]+\\/?${END}*)`,
      "gi",
    ),
  ],
];
const BAD =
  /(?:^https?:\/\/(?:api|status|app|www|slack)\.slack\.com|slack\.com\/(?:intl|help|apps|features|downloads)|slack\.(?:engineering|dev)\b|\.(?:svg|png|jpe?g|gif)\b|badge|shields\.io|\$\{|\{\{|%7B)/i;
const SHARED_SLACK = [
  [
    /slack\.cncf\.io|cloud-native\.slack\.com|communityinviter\.com\/apps\/cloud-native/i,
    "CNCF Slack",
  ],
  [/slack\.k8s\.io|slack\.kubernetes\.io|kubernetes\.slack\.com/i, "Kubernetes Slack"],
];
const LABEL = {
  discord: "Discord",
  slack: "Slack",
  zulip: "Zulip",
  matrix: "Matrix",
  gitter: "Gitter",
  telegram: "Telegram",
  irc: "IRC",
  forum: "Forum",
};
const IRC_NET = [
  [/libera/i, "Libera.Chat IRC"],
  [/oftc/i, "OFTC IRC"],
];

/** Chat links written in a README or web page, every distinct one, grouped by platform. */
function chatsIn(text, fullName) {
  const orgName = fullName.replace(/\s*\([^)]*\)/g, "").trim() || fullName;
  const out = [];
  for (const [p, re] of CHAT_RE) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const url = decodeURI(m[0].replace(/&amp;/g, "&")).replace(/[.,;:*_]+$/, "");
      if (BAD.test(url)) continue;
      const chat = { platform: p, workspace: `${orgName} ${LABEL[p]}`, joinUrl: url };
      if (p === "slack") {
        for (const [re2, name] of SHARED_SLACK) if (re2.test(url)) chat.workspace = name;
        // a link straight to a channel: join the workspace, then open the channel
        const ch = url.match(
          /^(https?:\/\/[a-z0-9-]+\.slack\.com)\/(?:messages|archives|channels)\/([^/?#]+)/i,
        );
        if (ch) {
          chat.joinUrl = ch[1];
          chat.channelUrl = url;
          if (!/^[CG][A-Z0-9]{6,}$/.test(ch[2])) chat.channels = [`#${ch[2]}`];
        }
      }
      if (p === "matrix") {
        const room = url.match(/#\/([#!][^?]+)/)?.[1];
        if (room) chat.channels = [room];
      }
      if (p === "irc") {
        const net = IRC_NET.find(([r]) => r.test(url));
        if (net) chat.workspace = net[1];
        const all = [...url.replace(/%23/gi, "#").matchAll(/#([A-Za-z0-9_.-]+)/g)].map((x) => x[1]);
        const name = all.filter((x) => !/^ircs?$/i.test(x)).pop();
        if (!name) continue; // an IRC network without a channel tells a newcomer nothing
        chat.channels = [`#${name}`];
        if (/libera/.test(url))
          chat.joinUrl = `https://web.libera.chat/?channels=${encodeURIComponent(`#${name}`)}`;
      }
      if (!out.some((c) => c.joinUrl === chat.joinUrl)) out.push(chat);
    }
  }
  return out;
}

/** A forum on the organization's own domain, or Discussions on its own GitHub account. */
function forumsIn(text, orgName, domain, owner) {
  const urls = [...text.matchAll(/https?:\/\/[^\s"'<>)\]`|]+/gi)].map((m) =>
    m[0].replace(/&amp;/g, "&").replace(/[.,;:*_]+$/, ""),
  );
  for (const url of urls) {
    const h = hostOf(url);
    if (!h) continue;
    const home = `https://${new URL(url).host}`;
    if (domain && baseDomain(h) === domain && /^(discuss|discourse|forum|forums)\./.test(h))
      return { platform: "forum", workspace: `${orgName} Forum`, joinUrl: home };
    if (domain && baseDomain(h) === domain && /^community\./.test(h) && /discourse/i.test(text))
      return { platform: "forum", workspace: `${orgName} Forum`, joinUrl: home };
  }
  if (owner) {
    const re = new RegExp(
      `https?:\\/\\/github\\.com\\/(?:orgs\\/)?${owner.replace(/[.]/g, "\\.")}\\/(?:[A-Za-z0-9_.-]+\\/)?discussions\\b`,
      "i",
    );
    const hit = urls.find((u) => re.test(u));
    if (hit)
      return {
        platform: "forum",
        workspace: "GitHub Discussions",
        joinUrl: hit.match(/^.*?discussions/i)[0],
      };
  }
  return null;
}

// ---------- checking invites ----------

/** Discord server name for a live invite; null when the invite is dead. */
async function discordGuild(url) {
  if (!/discord(?:app)?\.(?:gg|com)\//.test(url)) {
    // a vanity address on the organization's own domain redirects to the real invite
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
      url = res.headers.get("location") ?? "";
    } catch {
      return null;
    }
    if (!/discord(?:app)?\.(?:gg|com)\//.test(url)) return null;
  }
  const code = url.match(/\/([A-Za-z0-9-]+)\/?$/)?.[1];
  if (!code) return null;
  await sleep(400);
  const j = await fetchJson(`https://discord.com/api/v10/invites/${code}`);
  return j?.guild?.name ?? null;
}
async function slackAlive(url) {
  if (!/join\.slack\.com\/t\//.test(url)) return true; // vanity sign-up pages do not expire
  const html = await fetchText(url, { timeout: 15000 });
  return !!html && !/no longer active|link has expired|invalid_link/i.test(html);
}

/**
 * Keep a chat only when it is clearly this organization's: a live invite whose name matches.
 * Shared workspaces (CNCF, Kubernetes) and vanity chat domains on the org's own domain pass.
 */
async function verify(chat, tokens, domain, own) {
  // On the organization's own pages a differently named chat is still the one it points people
  // to (eGov links its "DIGIT Community" Discord); in another of its repositories it is that
  // repository's chat, not the organization's.
  const named = (name, why) =>
    related(name, tokens) ? { ok: true } : own ? { ok: true, note: why } : { ok: false, why };
  if (chat.platform === "discord") {
    const guild = await discordGuild(chat.joinUrl);
    if (!guild) return { ok: false, why: "dead invite" };
    chat.workspace = guild;
    return named(guild, `server "${guild}"`);
  }
  if (chat.platform === "slack") {
    if (/CNCF|Kubernetes/.test(chat.workspace))
      return own ? { ok: true } : { ok: false, why: chat.workspace };
    if (!(await slackAlive(chat.joinUrl))) return { ok: false, why: "dead invite" };
    const h = hostOf(chat.joinUrl) ?? "";
    if (domain && baseDomain(h) === domain) return { ok: true };
    const ws =
      chat.joinUrl.match(/join\.slack\.com\/t\/([^/]+)/)?.[1] ??
      h.match(/^([a-z0-9-]+)\.slack\.com$/)?.[1] ??
      h.replace(/^slack\./, "");
    return named(ws, `workspace "${ws}"`);
  }
  if (chat.platform === "gitter" && !own) {
    const room = chat.joinUrl.match(/gitter\.im\/[^/]+\/([^/?#]+)/)?.[1] ?? "";
    if (!/^(lobby|community|general|chat|dev)$/i.test(room) && !related(room, tokens))
      return { ok: false, why: `sub-project room "${room}"` };
  }
  if (["zulip", "gitter", "telegram"].includes(chat.platform)) {
    const id =
      chat.joinUrl.replace(/^https?:\/\/[^/]+\/?/, "") + " " + (hostOf(chat.joinUrl) ?? "");
    return named(id, `room "${id.trim()}"`);
  }
  if (["matrix", "irc"].includes(chat.platform) && related(chat.channels?.[0] ?? "", tokens))
    return { ok: true };
  return own ? { ok: true } : { ok: false, why: `${chat.platform} in another repository` };
}

// ---------- where to look ----------

const REPO_FILES = [
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "COMMUNITY.md",
  "SUPPORT.md",
  ".github/SUPPORT.md",
];
const COMMUNITY_LINK =
  /community|contact|chat|get-?involved|contribut|support|connect|join|discuss/i;

async function* sources(org) {
  const g =
    parseGithub(org.repoUrl) ?? parseGithub(org.githubUrl) ?? parseGithub(org.sourceCodeUrl);
  if (g?.repo) {
    yield [`https://github.com/${g.owner}/${g.repo}#readme`, await ghReadme(g.owner, g.repo), true];
    for (const f of REPO_FILES)
      yield [
        `https://github.com/${g.owner}/${g.repo}/blob/HEAD/${f}`,
        await ghFile(g.owner, g.repo, f),
        true,
      ];
  }
  if (g) {
    yield [
      `https://github.com/${g.owner}`,
      await ghFile(g.owner, ".github", "profile/README.md"),
      true,
    ];
    for (const f of ["CONTRIBUTING.md", "SUPPORT.md"])
      yield [
        `https://github.com/${g.owner}/.github/blob/HEAD/${f}`,
        await ghFile(g.owner, ".github", f),
        true,
      ];
    const user = await gh(`users/${g.owner}`);
    if (user?.type === "Organization") {
      const repos = (await gh(`users/${g.owner}/repos?per_page=100&type=owner`)) ?? [];
      const top = repos
        .filter((r) => !r.fork && !r.archived && r.name !== g.repo && r.name !== ".github")
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3);
      // a repository named after the organization (systemd/systemd) is its own main project
      const mine = [squash(org.name), squash(g.owner)];
      for (const r of top)
        yield [
          `https://github.com/${g.owner}/${r.name}#readme`,
          await ghReadme(g.owner, r.name),
          mine.includes(squash(r.name)),
        ];
    }
  }
  if (org.website && /^https?:/.test(org.website) && !/github\.com/.test(org.website)) {
    const home = await fetchText(org.website, { timeout: 15000 });
    yield [org.website, home, true];
    if (home) {
      const domain = baseDomain(hostOf(org.website));
      const pages = new Set();
      for (const m of home.matchAll(
        /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      )) {
        let u;
        try {
          u = new URL(m[1].replace(/&amp;/g, "&"), org.website).href;
        } catch {
          continue;
        }
        if (
          baseDomain(hostOf(u)) !== domain ||
          u.replace(/\/$/, "") === org.website.replace(/\/$/, "")
        )
          continue;
        const text = m[2].replace(/<[^>]+>/g, " ");
        const p = new URL(u).pathname;
        // a community page, not a news article that happens to mention contributing
        if (p.length > 40 || p.split("-").length > 4) continue;
        if (COMMUNITY_LINK.test(p) || COMMUNITY_LINK.test(text)) pages.add(u);
        if (pages.size >= 4) break;
      }
      for (const u of pages) yield [u, await fetchText(u, { timeout: 15000 }), true];
    }
  }
}

async function discussions(org) {
  const g = parseGithub(org.repoUrl) ?? parseGithub(org.githubUrl);
  if (!g?.repo) return null;
  const r = await gh(`repos/${g.owner}/${g.repo}`);
  return r?.has_discussions
    ? {
        chat: {
          platform: "forum",
          workspace: "GitHub Discussions",
          joinUrl: `${r.html_url}/discussions`,
        },
        source: r.html_url,
      }
    : null;
}

async function find(org, review, notes) {
  const g = parseGithub(org.repoUrl) ?? parseGithub(org.githubUrl);
  const domain =
    org.website && !/github\.com/.test(org.website) ? baseDomain(hostOf(org.website)) : null;
  const tokens = tokensOf(org.name, g?.owner, g?.repo, domain?.split(".")[0], org.slug);
  let forum = null;
  for await (const [src, text, own] of sources(org)) {
    if (!text) continue;
    const kept = [];
    for (const chat of chatsIn(text, org.name)) {
      if (kept.some((c) => c.platform === chat.platform)) continue; // first good link per platform
      const v = await verify(chat, tokens, domain, own);
      const row = {
        org: org.name,
        slug: org.slug,
        url: chat.joinUrl,
        why: v.why ?? v.note,
        source: src,
      };
      if (v.ok) kept.push(v.note ? { ...chat, note: true } : chat);
      else review.push(row);
      if (v.note) notes.push(row);
    }
    // an umbrella page lists its sub-projects' rooms too; keep the organization's own if it names one
    const plain = kept.filter((c) => !c.note);
    if (kept.length)
      return { chats: (plain.length ? plain : kept).map(({ note: _note, ...c }) => c), source: src };
    const f = forumsIn(text, org.name, domain, g?.owner);
    // another repository's Discussions belong to that repository, not the organization
    if (f && (own || /github\.com\/orgs\//.test(f.joinUrl))) forum ??= { chats: [f], source: src };
  }
  if (forum) return forum;
  const d = await discussions(org);
  return d ? { chats: [d.chat], source: d.source } : null;
}

// ---------- run ----------

/**
 * LFX groups of personal-account projects, named after the Linux Foundation project that runs
 * them: only that project's own website speaks for the group (never one member's repository).
 */
const GROUP_SITES = {
  "lfdt-lf-decentralized-trust": "https://www.lfdecentralizedtrust.org/",
  "riscv-risc-v-international": "https://riscv.org/",
  "kernel-the-linux-kernel-organization": "https://www.kernel.org/",
  "sonic-sonic-foundation": "https://sonicfoundation.dev/",
  "lfn-lf-networking-lfn": "https://lfnetworking.org/",
  "more-the-linux-foundation": "https://www.linuxfoundation.org/",
  "more-lf-energy-lfe": "https://lfenergy.org/",
  "more-lf-research": "https://www.linuxfoundation.org/research",
  "more-o-ran-software-community": "https://o-ran-sc.org/",
  "more-yocto-project-fund": "https://www.yoctoproject.org/",
};

const wanted = process.argv.slice(2);
const files = fs
  .readdirSync(DATA)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !wanted.length || wanted.includes(f.replace(/\.json$/, "")));
const review = [];
const notes = [];

for (const file of files) {
  const full = path.join(DATA, file);
  const doc = JSON.parse(fs.readFileSync(full, "utf8"));
  const orgs = doc.foundations ? doc.foundations.flatMap((f) => f.orgs) : doc.orgs;
  // an LFX group of personal-account projects has no GitHub account and no chat of its own
  const todo = orgs.filter(
    (o) => !o.chats?.length && !(doc.foundations && !o.githubUrl && !GROUP_SITES[o.slug]),
  );
  let found = 0;
  await pool(todo, 6, async (org) => {
    const group = doc.foundations && !org.githubUrl ? GROUP_SITES[org.slug] : null;
    const hit = await find(
      group ? { ...org, website: group, repoUrl: null, sourceCodeUrl: null } : org,
      review,
      notes,
    );
    if (!hit) return;
    org.chats = hit.chats;
    org.chatSource = hit.source;
    found++;
  });
  fs.writeFileSync(full, JSON.stringify(doc, null, 1) + "\n");
  const n = orgs.length;
  const have = orgs.filter((o) => o.chats?.length).length;
  console.log(
    `${file.padEnd(30)} ${n} orgs | was missing ${todo.length} | found ${found} | now ${have}/${n}`,
  );
}
fs.writeFileSync(
  REVIEW,
  JSON.stringify({ heldBack: review, acceptedFromOwnPages: notes }, null, 1),
);
console.log(
  `\n${review.length} links held back, ${notes.length} accepted with another name: ${REVIEW}`,
);
