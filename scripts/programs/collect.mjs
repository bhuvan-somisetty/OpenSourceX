// Builds apps/web/data/programs/<program>.json and downloads org logos into
// apps/web/public/logos/programs/<program>/.
//
// Every field comes from a published source and records where it came from:
//   1. the program's own official list (GSoC archive API, Season of Docs participants page,
//      Outreachy round pages, Summer of Bitcoin's org feed, ESoC's GitHub README, OSPP's org API,
//      C4GT DMP tickets, MLH Fellowship partners page, Igalia and Processing Foundation pages);
//   2. the organization's own GitHub account and repository README, or its own website,
//      for the repository, logo and chat links the program list does not carry.
// When a match is not exact, the field stays empty. Nothing is guessed.
//
// Usage: node scripts/programs/collect.mjs [program ...]
// Then run find-chats.mjs for the same programs: it looks deeper for community links.
// Needs a GitHub token (GITHUB_TOKEN, or a logged-in `gh`).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { OVERRIDES } from "./overrides.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "apps/web/data/programs");
const LOGOS = path.join(ROOT, "apps/web/public/logos/programs");
const CACHE = path.join(os.tmpdir(), "opensourcex-collect-cache");
const UA = "OpenSourceX-collector/1.0 (+https://opensource-x.vercel.app)";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const TOKEN = process.env.GITHUB_TOKEN || execSync("gh auth token").toString().trim();
const TODAY = new Date().toISOString().slice(0, 10);

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

// ---------- small utilities ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const norm = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(the|inc|foundation|project|community|org|organization|organisation)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
const slugify = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const decode = (s) =>
  (s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const strip = (html) => decode((html ?? "").replace(/<[^>]+>/g, " "));

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

function cacheKey(...parts) {
  return path.join(CACHE, crypto.createHash("sha1").update(parts.join("|")).digest("hex"));
}

/** GET (or POST) with timeout, retry and an on-disk cache. Returns text or null. */
async function fetchText(
  url,
  { method = "GET", body, headers = {}, timeout = 20000, cache = true } = {},
) {
  const key = cacheKey(method, url, body ?? "");
  if (cache && fs.existsSync(key)) {
    const v = fs.readFileSync(key, "utf8");
    return v === "\u0000" ? null : v;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        body,
        // some official sites refuse unknown agents; APIs get the collector's own name
        headers: {
          "user-agent": /api\.github\.com|summer\.ospp|summerofbitcoin\.org\/v1/.test(url)
            ? UA
            : BROWSER_UA,
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
        const wait = reset
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

async function fetchJson(url, opts) {
  const t = await fetchText(url, opts);
  if (t == null) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

// ---------- GitHub ----------

const GH_HEAD = { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json" };
const gh = (p) => fetchJson(`https://api.github.com/${p}`, { headers: GH_HEAD });
let lastSearch = 0;
async function ghSearch(p) {
  const wait = lastSearch + 2200 - Date.now();
  if (wait > 0) await sleep(wait);
  lastSearch = Date.now();
  return gh(p);
}
async function ghReadme(owner, repo) {
  return fetchText(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { ...GH_HEAD, accept: "application/vnd.github.raw" },
  });
}

const NOT_OWNERS = new Set(
  "sponsors features about orgs topics marketplace login join apps collections site pricing enterprise security readme settings notifications explore search contact customer-stories team issues pulls trending events codespaces copilot solutions resources signup new home dashboard".split(
    " ",
  ),
);

/** github.com/<owner>[/<repo>] from a URL, or null. */
export function parseGithub(url) {
  const orgs = (url ?? "").match(/^https?:\/\/(?:www\.)?github\.com\/orgs\/([A-Za-z0-9_.-]+)/i);
  if (orgs) return { owner: orgs[1], repo: null };
  const m = (url ?? "").match(
    /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i,
  );
  if (!m || NOT_OWNERS.has(m[1].toLowerCase())) return null;
  const repo =
    m[2] && !/^(issues|pulls|wiki|discussions|blob|tree)$/i.test(m[2])
      ? m[2].replace(/\.git$/, "")
      : null;
  return { owner: m[1], repo };
}

const ghUserCache = new Map();
async function ghUser(owner) {
  if (!ghUserCache.has(owner)) ghUserCache.set(owner, await gh(`users/${owner}`));
  return ghUserCache.get(owner);
}

const siteOf = (u) => {
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return null;
  }
};

/**
 * A GitHub organization that is provably this organization: its own website field points at
 * the organization's website, or (when no website is known) its login is exactly the name.
 * A matching display name alone is not enough; anyone can name an account anything.
 */
async function exactGithubOrg(name, website) {
  const n = norm(name);
  // Without the organization's website there is nothing to prove an account is theirs
  // (github.com/krux is not the Krux signer), so do not search at all.
  if (n.length < 3 || !website) return null;
  const res = await ghSearch(`search/users?q=${encodeURIComponent(`${name} type:org`)}&per_page=5`);
  const want = website ? siteOf(website) : null;
  // literal comparison: "metal3-community" must not count as "Metal3"
  const bare = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = bare(name);
  for (const it of res?.items ?? []) {
    const u = await ghUser(it.login);
    if (!u || u.public_repos === 0) continue;
    if (u.blog && siteOf(u.blog) === want && (bare(it.login) === b || bare(u.name) === b))
      return it.login;
  }
  return null;
}

/** Find the organization's GitHub owner from its own website. */
async function githubFromWebsite(website, name) {
  if (!website || !/^https?:/.test(website)) return null;
  const direct = parseGithub(website);
  if (direct) return direct;
  const html = await fetchText(website, { timeout: 15000 });
  if (!html) return null;
  const counts = new Map();
  for (const m of html.matchAll(
    /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/gi,
  )) {
    const g = parseGithub(m[0]);
    if (!g) continue;
    const k = g.owner.toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const domain = norm(
    new URL(website).hostname
      .replace(/^www\./, "")
      .split(".")
      .slice(0, -1)
      .join(""),
  );
  const n = norm(name);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  // A repository the organization's own homepage links to, named after the organization
  // (skywalking.apache.org links apache/skywalking; nacos.io links alibaba/nacos).
  const bare = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const bn = bare(name);
  for (const m of html.matchAll(
    /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi,
  )) {
    const g = parseGithub(m[0]);
    if (!g?.repo) continue;
    const br = bare(g.repo);
    if (br.length >= 4 && (br === bn || bn.endsWith(br) || bn.startsWith(br))) return g;
  }
  for (const [owner] of ranked) {
    if (!sameName(owner, n) && !sameName(owner, domain)) continue;
    // The account page only: which of its repositories is "the" one is not knowable from a homepage.
    const real = [...html.matchAll(new RegExp(`github\\.com/(${owner})`, "ig"))][0]?.[1] ?? owner;
    return { owner: real, repo: null };
  }
  return null;
}

const AFFIX = [
  "hq",
  "dev",
  "org",
  "io",
  "project",
  "lang",
  "app",
  "labs",
  "team",
  "official",
  "community",
  "foundation",
  "inc",
  "oss",
  "opensource",
  "github",
  "gh",
];
/** An account name that is the organization's name, allowing only common affixes. */
function sameName(owner, target) {
  const o = norm(owner);
  if (!o || !target || target.length < 2) return false;
  if (o === target) return true;
  for (const a of AFFIX) if (o === target + a || o === a + target) return true;
  return false;
}

// ---------- chat links ----------

const CHAT_RE = [
  [
    "discord",
    /https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[A-Za-z0-9-]+/gi,
  ],
  [
    "slack",
    /https?:\/\/(?:join\.slack\.com\/t\/[^\s"'<>)\]]+|[a-z0-9-]+\.slack\.com\/?[^\s"'<>)\]]*|slack\.[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/?[^\s"'<>)\]]*)/gi,
  ],
  ["zulip", /https?:\/\/(?:[a-z0-9-]+\.zulipchat\.com|chat\.zulip\.org)\/?[^\s"'<>)\]]*/gi],
  ["matrix", /https?:\/\/matrix\.to\/#\/[^\s"'<>)\]]+/gi],
  ["gitter", /https?:\/\/(?:app\.)?gitter\.im\/[^\s"'<>)\]]+/gi],
  ["telegram", /https?:\/\/t\.me\/[A-Za-z0-9_+]+/gi],
];
const BAD_SLACK =
  /(?:^https?:\/\/(?:api|status|app|www)\.slack\.com|slack\.com\/(?:intl|help|apps|features|downloads)|\.(?:svg|png)\b|badge)/i;

const SHARED_SLACK = [
  [
    /slack\.cncf\.io|cloud-native\.slack\.com|communityinviter\.com\/apps\/cloud-native/i,
    "CNCF Slack",
  ],
  [/slack\.k8s\.io|slack\.kubernetes\.io|kubernetes\.slack\.com/i, "Kubernetes Slack"],
];

function workspaceName(platform, url, orgName) {
  if (platform === "slack") for (const [re, name] of SHARED_SLACK) if (re.test(url)) return name;
  const label = {
    discord: "Discord",
    slack: "Slack",
    zulip: "Zulip",
    matrix: "Matrix",
    gitter: "Gitter",
    telegram: "Telegram",
    irc: "IRC",
    other: "Chat",
  }[platform];
  return `${orgName} ${label}`;
}

export function classifyChat(url) {
  for (const [p, re] of CHAT_RE) {
    re.lastIndex = 0;
    if (re.test(url)) return p === "slack" && BAD_SLACK.test(url) ? "other" : p;
  }
  if (/libera\.chat|irc:\/\/|ircs:\/\/|webchat\.oftc|kiwiirc/i.test(url)) return "irc";
  return "other";
}

/** Chat invites written in a README or web page, at most one per platform. */
export function chatsIn(text, orgName) {
  const out = [];
  const seen = new Set();
  for (const [p, re] of CHAT_RE) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const url = m[0].replace(/[.,;:]+$/, "");
      if (p === "slack" && BAD_SLACK.test(url)) continue;
      if (seen.has(p)) break;
      seen.add(p);
      out.push({ platform: p, workspace: workspaceName(p, url, orgName), joinUrl: url });
    }
  }
  return out;
}

// ---------- logos ----------

const EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/**
 * The logo an organization's own website declares, best first: its touch icon, an SVG icon,
 * an image marked as the logo, a large PNG icon, then the favicon.
 */
async function logoFromWebsite(website, orgName) {
  // a github.com page only offers GitHub's own icon
  if (!website || !/^https?:/.test(website) || /^https?:\/\/(www\.)?github\.com/i.test(website))
    return null;
  const html = await fetchText(website, { timeout: 15000 });
  if (!html) return null;
  const abs = (href) => {
    try {
      return new URL(href.replace(/&amp;/g, "&"), website).href;
    } catch {
      return null;
    }
  };
  const attr = (tag, name) =>
    tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? null;
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const rel = (tag) => (attr(tag, "rel") ?? "").toLowerCase();
  const size = (tag) => Number((attr(tag, "sizes") ?? "0x0").split("x")[0]) || 0;
  const icons = links.filter((l) => /(^|\s)icon(\s|$)/.test(rel(l)) && attr(l, "href"));

  // 1. the touch icon the site declares for itself (square, high resolution)
  const touch = links
    .filter((l) => rel(l).includes("apple-touch-icon"))
    .sort((a, b) => size(b) - size(a))[0];
  if (touch && attr(touch, "href")) return abs(attr(touch, "href"));
  // 2. an SVG site icon
  const svg = icons.find(
    (l) => /\.svg(\?|$)/i.test(attr(l, "href")) || /svg/i.test(attr(l, "type") ?? ""),
  );
  if (svg) return abs(attr(svg, "href"));
  // 3. a large PNG site icon
  const big = [...icons].sort((a, b) => size(b) - size(a)).find((l) => size(l) >= 96);
  if (big) return abs(attr(big, "href"));
  // 4. the header logo: the image inside the link back to the homepage, or an image whose
  //    file name or alt text names the organization (not a sponsor's or partner's logo)
  const host = siteOf(website) ?? "";
  const home = new RegExp(
    `<a\\b[^>]*href\\s*=\\s*["'](?:/|./|https?://(?:www.)?${host.replace(/[.]/g, "\\.")}/?)["'][^>]*>\\s*(<img\\b[^>]*>)`,
    "i",
  );
  const homeImg = html.match(home)?.[1];
  if (homeImg && attr(homeImg, "src") && !attr(homeImg, "src").startsWith("data:"))
    return abs(attr(homeImg, "src"));
  const tokens = [
    ...new Set([...(orgName ?? "").toLowerCase().split(/[^a-z0-9]+/), host.split(".")[0]]),
  ].filter(
    (t) =>
      t.length >= 3 &&
      !["the", "and", "for", "project", "foundation", "community", "open", "org", "www"].includes(
        t,
      ),
  );
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(m[0], "src");
    if (!src || src.startsWith("data:")) continue;
    // the file name and alt text only: a sponsor logo hosted on the org's own domain must not count
    const file = src.split(/[?#]/)[0].split("/").pop() ?? "";
    const hint = `${file} ${attr(m[0], "alt") ?? ""}`.toLowerCase();
    if (/logo/.test(hint) && tokens.some((t) => hint.includes(t))) return abs(src);
  }
  // 5. any declared site icon, then the conventional favicon
  const png = [...icons].sort((a, b) => size(b) - size(a))[0];
  if (png) return abs(attr(png, "href"));
  return abs("/favicon.ico");
}
async function downloadLogo(program, slug, url) {
  if (!url) return null;
  const dir = path.join(LOGOS, program);
  fs.mkdirSync(dir, { recursive: true });
  const existing = fs.readdirSync(dir).find((f) => f.startsWith(`${slug}.`));
  if (existing) return `/logos/programs/${program}/${existing}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return null;
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const ext =
        EXT[type] ??
        url
          .match(/\.(png|jpe?g|svg|webp|gif)(?:\?|$)/i)?.[1]
          ?.toLowerCase()
          .replace("jpeg", "jpg");
      if (!ext) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100 || buf.length > 2_000_000) return null;
      fs.writeFileSync(path.join(dir, `${slug}.${ext}`), buf);
      return `/logos/programs/${program}/${slug}.${ext}`;
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  // some official sites refuse Node's TLS chain or user agent; curl with a browser agent works
  const ext = url
    .match(/\.(png|jpe?g|svg|webp|gif|ico)(?:\?|$)/i)?.[1]
    ?.toLowerCase()
    .replace("jpeg", "jpg");
  if (!ext) return null;
  const file = path.join(dir, `${slug}.${ext}`);
  try {
    execSync(
      `curl -sL --max-time 40 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o "${file}" "${url}"`,
    );
    if (fs.existsSync(file) && fs.statSync(file).size > 100)
      return `/logos/programs/${program}/${slug}.${ext}`;
    fs.rmSync(file, { force: true });
  } catch {}
  return null;
}

/**
 * The logo a repository shows at the top of its own README: an HTML or Markdown image whose
 * alt text, title or file name says "logo" and names the project (e.g. "nostream logo",
 * "GDevelop logo", "skpro-logo.png"). Relative paths resolve against the repository.
 */
async function readmeLogo(owner, repo, name) {
  const readme = await ghReadme(owner, repo);
  if (!readme) return null;
  const want = [norm(name), norm(repo)].filter((t) => t.length >= 3);
  const images = [
    ...[...readme.matchAll(/<img\b[^>]*>/gi)].map((m) => ({
      src: m[0].match(/src\s*=\s*["']([^"']+)["']/i)?.[1],
      text: `${m[0].match(/alt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""} ${m[0].match(/title\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""}`,
    })),
    ...[...readme.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g)].map((m) => ({
      src: m[2],
      text: `${m[1]} ${m[3] ?? ""}`,
    })),
  ].filter((i) => i.src && !/shields\.io|badge|travis-ci|codecov|actions\/workflows/i.test(i.src));
  for (const i of images) {
    const file = decodeURIComponent(i.src.split(/[?#]/)[0].split("/").pop() ?? "");
    const hint = `${i.text} ${file}`.toLowerCase();
    if (!/logo/.test(hint)) continue;
    if (!want.some((t) => norm(hint).includes(t))) continue;
    if (/^https?:/.test(i.src))
      return i.src.replace(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//,
        "https://raw.githubusercontent.com/$1/$2/",
      );
    return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${i.src.replace(/^\.?\//, "")}`;
  }
  return null;
}

// ---------- enrichment shared by every program ----------

/**
 * Fill repository, logo and chat links that the program list does not carry, from the
 * organization's own GitHub account, README and website. `known` maps normalised names to
 * GSoC records so the same organization is described the same way everywhere.
 */
async function enrich(program, org, known) {
  const ov = OVERRIDES[program]?.[org.slug] ?? OVERRIDES["*"]?.[norm(org.name)];
  if (ov) Object.assign(org, ov.fields ?? {});
  const twin = known?.get(norm(org.name));

  if (twin) {
    org.website ??= twin.website;
    org.repoUrl ??= twin.repoUrl;
    if (!org.chats?.length && twin.chats?.length) {
      org.chats = twin.chats;
      org.chatSource = twin.chatSource;
    }
    org.logoFrom ??= twin.logoFrom;
  }

  if (!org.repoUrl && org.sourceCodeUrl) org.repoUrl = org.sourceCodeUrl; // the program's own link, any host
  let g =
    parseGithub(org.repoUrl) ??
    (ov?.github ? parseGithub(`https://github.com/${ov.github}`) : null);
  if (!g && !org.repoUrl && org.website) g = await githubFromWebsite(org.website, org.name);
  if (!g && !ov?.noGithubSearch && !twin) {
    const owner = await exactGithubOrg(org.name, org.website);
    if (owner) g = { owner, repo: null };
  }
  if (g) {
    const user = await ghUser(g.owner);
    if (!user) g = null;
    else if (org.requireOrgAccount && user.type !== "Organization") {
      // a ticket filed in someone's personal repository does not make it the organization's repository
      g = null;
      org.repoUrl = null;
    } else {
      g.owner = user.login;
      // a personal account's avatar is a person's picture, not the organization's logo
      g.avatar = user.type === "Organization" ? user.avatar_url : null;
      // a personal account's website is the person's, not the organization's
      if (user.type === "Organization" && user.blog)
        org.website ??= /^https?:/.test(user.blog) ? user.blog : `https://${user.blog}`;
    }
  }
  if (g && !org.repoUrl)
    org.repoUrl = g.repo
      ? `https://github.com/${g.owner}/${g.repo}`
      : `https://github.com/${g.owner}`;
  if (!org.githubUrl && g) org.githubUrl = `https://github.com/${g.owner}`;

  if (!org.chats?.length) {
    let found = [];
    const readmes = g?.repo
      ? [[g.owner, g.repo, `https://github.com/${g.owner}/${g.repo}#readme`]]
      : g
        ? [[g.owner, ".github", `https://github.com/${g.owner}`]]
        : [];
    for (const [owner, repo, srcUrl] of readmes) {
      const readme =
        repo === ".github"
          ? await fetchText(
              `https://api.github.com/repos/${owner}/.github/contents/profile/README.md`,
              { headers: { ...GH_HEAD, accept: "application/vnd.github.raw" } },
            )
          : await ghReadme(owner, repo);
      if (readme) {
        found = chatsIn(readme, org.name);
        if (found.length) {
          org.chatSource = srcUrl;
          break;
        }
      }
    }
    if (!found.length && org.website) {
      const html = await fetchText(org.website, { timeout: 15000 });
      if (html) {
        found = chatsIn(html, org.name);
        if (found.length) org.chatSource = org.website;
      }
    }
    org.chats = found;
  }

  if (!org.logo && !org.logoFrom && twin?.logo) {
    // Same organization as a GSoC entry: reuse that logo file under this program's folder.
    const from = path.join(ROOT, "apps/web/public", twin.logo);
    if (fs.existsSync(from)) {
      const dir = path.join(LOGOS, program);
      fs.mkdirSync(dir, { recursive: true });
      const file = `${org.slug}${path.extname(from)}`;
      fs.copyFileSync(from, path.join(dir, file));
      org.logo = `/logos/programs/${program}/${file}`;
    }
  }
  // A project that lives inside a larger account (sktime/skpro, apache/airflow) has its own logo;
  // the parent account's avatar would make several projects look identical.
  const subProject = g?.repo && norm(g.repo) !== norm(g.owner);
  if (!org.logo && !org.logoFrom && subProject) {
    const src = await readmeLogo(g.owner, g.repo, org.name);
    if (src) org.logo = await downloadLogo(program, org.slug, src);
  }
  if (!org.logo) {
    const src = org.logoFrom ?? g?.avatar ?? null;
    org.logo = await downloadLogo(
      program,
      org.slug,
      src && g?.avatar === src ? `${src}${src.includes("?") ? "&" : "?"}s=240` : src,
    );
  }
  if (!org.logo && org.logoUrl) org.logo = await downloadLogo(program, org.slug, org.logoUrl);
  if (!org.logo && g?.repo && !subProject) {
    const src = await readmeLogo(g.owner, g.repo, org.name);
    if (src) org.logo = await downloadLogo(program, org.slug, src);
  }
  if (!org.logo && org.website)
    org.logo = await downloadLogo(program, org.slug, await logoFromWebsite(org.website, org.name));
  delete org.logoUrl;
  delete org.logoFrom;
  delete org.requireOrgAccount;
  return org;
}

// ---------- programs ----------

const GSOC_YEARS = [2022, 2023, 2024, 2025, 2026];

async function gsoc() {
  const bySlug = new Map();
  for (const year of GSOC_YEARS) {
    const list = await fetchJson(
      `https://summerofcode.withgoogle.com/api/program/${year}/organizations/`,
    );
    for (const o of list ?? []) {
      // GSoC sometimes gives the same organization a new slug in a later year; merge by name.
      const key = norm(o.name);
      const cur = bySlug.get(key) ?? { years: [], raw: null };
      if (!cur.years.includes(year)) cur.years.push(year);
      cur.raw = o; // later years overwrite earlier ones, so the newest description and slug win
      bySlug.set(key, cur);
    }
  }
  return [...bySlug.values()].map(({ years, raw: o }) => {
    const slug = o.slug;
    const latest = years[years.length - 1];
    const chat = (o.contact_links ?? []).find((l) => l.name === "chat")?.value;
    const mailing = (o.contact_links ?? []).find((l) => l.name === "mailingList")?.value;
    // some organizations list several URLs in this one field; the first is their main one
    const firstUrl = (o.source_code ?? "").match(/https?:\/\/[^\s,;]+/)?.[0] ?? null;
    const src = firstUrl ? firstUrl.replace(/[.,;]+$/, "") : null;
    const platform = chat ? classifyChat(chat) : null;
    return {
      slug,
      name: o.name,
      tagline: o.tagline ?? null,
      description: o.description ?? null,
      website: o.website_url ?? null,
      repoUrl: src && parseGithub(src) ? src : null,
      sourceCodeUrl: src,
      logoFrom: o.logo_url ?? null,
      tags: [...new Set([...(o.tech_tags ?? []), ...(o.topic_tags ?? [])])].slice(0, 12),
      categories: o.categories ?? [],
      years,
      links: [
        o.ideas_link && { label: "Project ideas", url: o.ideas_link },
        o.contributor_guidance_url && {
          label: "Contributor guidance",
          url: o.contributor_guidance_url,
        },
        mailing && /^https?:/.test(mailing) && { label: "Mailing list", url: mailing },
        {
          label: `GSoC ${latest} page`,
          url: `https://summerofcode.withgoogle.com/programs/${latest}/organizations/${slug}`,
        },
      ].filter(Boolean),
      chats:
        chat && /^https?:/.test(chat)
          ? [{ platform, workspace: workspaceName(platform, chat, o.name), joinUrl: chat }]
          : [],
      chatSource: chat
        ? `https://summerofcode.withgoogle.com/programs/${latest}/organizations/${slug}`
        : null,
      sourceUrl: `https://summerofcode.withgoogle.com/programs/${latest}/organizations/${slug}`,
    };
  });
}

// Names Google wrote differently in different years for the same organization
// (checked: each pair links the same website on the participants page).
const SOD_ALIAS = {
  "INCF (International Neuroinformatics Coordinating Facility)": "INCF", // incf.org
  "International Neuroinformatics Coordinating Facility": "INCF", // incf.org
  "The Julia Programming Language": "The Julia Language", // julialang.org
};

async function seasonOfDocs() {
  const url = "https://developers.google.com/season-of-docs/docs/participants";
  const html = await fetchText(`${url}?hl=en`, { headers: { "accept-language": "en" } });
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1]),
  );
  const byName = new Map();
  for (const cells of rows) {
    if (cells.length < 4) continue;
    const year = Number(strip(cells[0]));
    if (!(year >= 2019 && year <= 2030)) continue;
    const a = cells[1].match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const name = a ? strip(a[2]) : strip(cells[1]);
    if (!name) continue;
    const site = a ? a[1] : null;
    const proj =
      cells[4]?.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/) ??
      cells[3]?.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const k = norm(SOD_ALIAS[name] ?? name);
    const cur = byName.get(k) ?? {
      name: SOD_ALIAS[name] ?? name,
      website: null,
      years: new Set(),
      projects: [],
    };
    cur.years.add(year);
    if (site && !cur.website && !/docs\.google\.com/.test(site)) cur.website = site;
    if (proj) cur.projects.push({ year, title: strip(proj[2]), url: proj[1] });
    byName.set(k, cur);
  }
  // Google wrote some names differently across years ("INCF", "International Neuroinformatics
  // Coordinating Facility (INCF)"). Merge only when the website is the same AND one name
  // contains the other, so distinct projects that share a parent site stay separate.
  const list = [...byName.values()];
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < list.length; i++)
      for (let j = 0; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (i === j || !a || !b || !a.website || !b.website) continue;
        if (siteOf(a.website) !== siteOf(b.website)) continue;
        const na = norm(a.name);
        const nb = norm(b.name);
        if (na.length < nb.length && nb.includes(na)) {
          for (const y of b.years) a.years.add(y);
          a.projects.push(...b.projects);
          list[j] = null;
          changed = true;
        }
      }
  }
  return list.filter(Boolean).map((o) => ({
    slug: slugify(o.name),
    name: o.name,
    tagline: null,
    description: null,
    website: parseGithub(o.website) ? null : o.website,
    repoUrl: parseGithub(o.website) ? o.website : null,
    tags: [],
    years: [...o.years].sort(),
    projects: o.projects.sort((a, b) => b.year - a.year),
    links: [],
    sourceUrl: url,
  }));
}

const OUTREACHY_ROUNDS = [
  ["outreachy-may-2022-internship-round", "May 2022", 2022],
  ["outreachy-december-2022-internship-round", "December 2022", 2022],
  ["outreachy-may-2023-internship-cohort", "May 2023", 2023],
  ["outreachy-december-2023-internship-round", "December 2023", 2023],
  ["outreachy-june-2024-internship-round", "June 2024", 2024],
  ["outreachy-june-2025-internship-cohort", "June 2025", 2025],
  ["outreachy-december-2025-internship-cohort", "December 2025", 2025],
];

async function outreachy() {
  const byName = new Map();
  for (const [path_, label, year] of OUTREACHY_ROUNDS) {
    const url = `https://www.outreachy.org/${path_}/`;
    const html = await fetchText(url);
    if (!html) continue;
    const parts = html.split(/<h4>/).slice(1);
    for (const part of parts) {
      const name = strip(part.slice(0, part.indexOf("</h4>")));
      if (!name || name.length > 80) continue;
      const tagline = strip(part.match(/<\/h4>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
      const landing = part.match(/href="(\/[^"]*\/communities\/[^"]+\/)"/)?.[1];
      if (!landing) continue;
      const titles = [...part.matchAll(/<p><strong>([\s\S]*?)<\/strong><\/p>/g)]
        .map((m) => strip(m[1]))
        .filter(Boolean);
      const k = norm(name);
      const cur = byName.get(k) ?? {
        name,
        tagline,
        years: new Set(),
        rounds: [],
        projects: [],
        landing: null,
      };
      cur.years.add(year);
      cur.rounds.push(label);
      cur.tagline ??= tagline;
      cur.landing = `https://www.outreachy.org${landing}`;
      for (const t of [...new Set(titles)]) cur.projects.push({ year, title: t, round: label });
      byName.set(k, cur);
    }
  }
  return [...byName.values()].map((o) => ({
    slug: slugify(o.name),
    name: o.name,
    tagline: o.tagline,
    description: null,
    website: null,
    repoUrl: null,
    tags: [],
    years: [...o.years].sort(),
    rounds: o.rounds,
    projects: o.projects.sort((a, b) => b.year - a.year),
    links: [{ label: "Outreachy community page", url: o.landing }],
    sourceUrl: o.landing,
  }));
}

const SOB_FEED =
  "https://www.summerofbitcoin.org/v1/datasource/airtable/5abf9a13-d06f-44d6-b50c-187328a34a81/e1fe7459-43b9-446e-b78f-6bac70aa6d0c/27095893-142f-450d-ba8e-b244e02722f4/7f16bea1-c0aa-46b3-af3a-82fcec855166/data";

async function summerOfBitcoin() {
  const data = await fetchJson(SOB_FEED, {
    method: "POST",
    body: JSON.stringify({ page_size: 100 }),
    headers: { "content-type": "application/json" },
    cache: false,
  });
  return (data?.records ?? []).map((r) => {
    const f = r.fields;
    return {
      slug: slugify(f.Name),
      name: f.Name,
      tagline: null,
      description: (f.Description ?? "").trim() || null,
      website: null,
      repoUrl: null,
      logoFrom: f.Attachments?.[0]?.url ?? null,
      tags: Array.isArray(f.Technologies) ? f.Technologies : [],
      years: [2026],
      links: [],
      sourceUrl: "https://www.summerofbitcoin.org/organizations",
    };
  });
}

async function esoc() {
  const out = new Map();
  for (const [repo, year] of [["european-summer-of-code/esoc2026", 2026]]) {
    const readme = await ghReadme(...repo.split("/"));
    const section =
      readme?.split(/### Affiliated open source projects/i)[1]?.split(/\n#{2,5} /)[0] ?? "";
    for (const m of section.matchAll(/\*\s+\[`?([^`\]]+)`?\]\((https:\/\/github\.com\/[^)]+)\)/g)) {
      const name = m[1].trim();
      const cur = out.get(norm(name)) ?? {
        slug: slugify(name),
        name,
        tagline: null,
        description: null,
        website: null,
        repoUrl: m[2],
        tags: [],
        years: [],
        links: [],
        sourceUrl: `https://github.com/${repo}#affiliated-open-source-projects`,
      };
      if (!cur.years.includes(year)) cur.years.push(year);
      out.set(norm(name), cur);
    }
  }
  return [...out.values()];
}

async function ospp() {
  const data = await fetchJson("https://summer.ospp.ac.cn/api/getOrgList", {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json" },
    cache: false,
  });
  return (data?.rows ?? []).map((o) => {
    const name = (o.titleEN || o.title || "").trim();
    let repos = [];
    try {
      repos = JSON.parse((o.mainRepo ?? "[]").replace(/'/g, '"'));
    } catch {}
    let tags = [];
    try {
      tags = JSON.parse(o.tech_tag ?? "[]").map((t) => t[1]);
    } catch {}
    try {
      tags = [...tags, ...JSON.parse(o.domain_tag ?? "[]")];
    } catch {}
    const repo = repos.find((r) => /^https?:/.test(r)) ?? null;
    return {
      slug: slugify(name),
      name,
      tagline: null,
      description: (o.full_desEN || o.descriptionEn || "").trim() || null,
      website: o.urlEN || o.url || null,
      repoUrl: repo && parseGithub(repo) ? repo : null,
      sourceCodeUrl: repo,
      logoFrom: o.img || null,
      tags: [...new Set(tags)].slice(0, 12),
      years: [2026],
      links: [],
      sourceUrl: "https://summer.ospp.ac.cn/org/orglist",
    };
  });
}

async function c4gt() {
  const items = [];
  for (let page = 1; page <= 5; page++) {
    const res = await ghSearch(
      `search/issues?q=${encodeURIComponent('label:"DMP 2025"')}&per_page=100&page=${page}`,
    );
    items.push(...(res?.items ?? []));
    if ((res?.items ?? []).length < 100) break;
  }
  const byName = new Map();
  for (const it of items) {
    const body = it.body ?? "";
    const orgName = body.match(/### Organi[sz]ation Name\s+([^\n]+)/)?.[1]?.trim();
    const product = body.match(/### Product Name\s+([^\n]+)/)?.[1]?.trim();
    if (!orgName || /^_?no response_?$/i.test(orgName)) continue;
    // test tickets ("Demo", "TEST") are not real projects
    if (
      /^(demo|test|testing)$/i.test(product ?? "") ||
      /^\[?DMP 2025\]?:?\s*(demo|test)\b/i.test(it.title)
    )
      continue;
    const repo = it.repository_url.split("/repos/")[1];
    const k = norm(orgName.replace(/\band\b|&/gi, ""));
    const cur = byName.get(k) ?? { name: orgName, repos: new Map(), projects: [] };
    if (!/^(CodeForGoodTech|Code4GovTech)\/C4GT$/i.test(repo))
      cur.repos.set(repo, (cur.repos.get(repo) ?? 0) + 1);
    cur.projects.push({
      year: 2025,
      title: it.title.replace(/^\[DMP 2025\]:?\s*/i, ""),
      url: it.html_url,
      product: product ?? null,
    });
    byName.set(k, cur);
  }
  return [...byName.values()].map((o) => {
    const top = [...o.repos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      slug: slugify(o.name),
      name: o.name,
      tagline: null,
      description: null,
      website: null,
      repoUrl: top ? `https://github.com/${top}` : null,
      requireOrgAccount: true,
      tags: [],
      years: [2025],
      projects: o.projects,
      links: [],
      sourceUrl:
        o.projects[0]?.url ??
        "https://github.com/Code4GovTech/C4GT/issues?q=label%3A%22DMP+2025%22",
    };
  });
}

async function mlh() {
  const url = "https://fellowship.mlh.io/partners";
  const html = await fetchText(url);
  const seen = new Map();
  for (const m of html.matchAll(
    /<img[^>]*alt="([^"]+)"[^>]*src="(https:\/\/www\.datocms-assets\.com\/[^"]+\.svg)"/g,
  )) {
    const name = decode(m[1])
      .replace(/\s*(logo|MLH Fellowship)\s*$/i, "")
      .trim();
    if (!seen.has(norm(name))) seen.set(norm(name), { name, logo: m[2] });
  }
  return [...seen.values()].map(({ name, logo }) => ({
    slug: slugify(name),
    name,
    tagline: "MLH Fellowship partner",
    // MLH publishes these marks in white for its dark site; they need a dark tile
    logoOnDark: true,
    description: null,
    website: null,
    repoUrl: null,
    logoFrom: logo,
    tags: [],
    years: [],
    links: [],
    sourceUrl: url,
  }));
}

async function igalia() {
  return [
    {
      slug: "igalia",
      name: "Igalia",
      tagline: "Open Source Consulting and Development",
      description:
        "The Igalia Coding Experience is a grant program for people studying Computer Science, Information Technology or Free Software, who work hand in hand with Igalia programmers.",
      website: "https://www.igalia.com/",
      repoUrl: null,
      tags: [],
      years: [],
      links: [
        { label: "Igalia Coding Experience", url: "https://www.igalia.com/coding-experience/" },
      ],
      sourceUrl: "https://www.igalia.com/coding-experience/",
    },
  ];
}

async function processing() {
  const url = "https://processingfoundation.org/fellowships";
  // The fellowship archive is paginated: /fellowships, then /programs/fellowships/2, /3, ...
  const pages = [url];
  for (let n = 2; n <= 20; n++)
    pages.push(`https://processingfoundation.org/programs/fellowships/${n}`);
  const projects = [];
  const seen = new Set();
  for (const pageUrl of pages) {
    const html = await fetchText(pageUrl);
    if (!html) break;
    // Rows read "<year> <names> <project>"; only the year and project title are kept (no personal names).
    const lines = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
      .split(/<\/(?:div|p|li|tr|td|h\d|span|a|button)>/)
      .map(strip)
      .filter(Boolean);
    const start = lines.findIndex((l) => l === "Project Name");
    for (let i = start + 1; start >= 0 && i + 2 < lines.length; i++) {
      if (/^20\d\d$/.test(lines[i]) && lines[i + 2] && !/^20\d\d$/.test(lines[i + 2])) {
        const key = `${lines[i]}|${lines[i + 2]}`;
        if (!seen.has(key)) {
          seen.add(key);
          projects.push({ year: Number(lines[i]), title: lines[i + 2] });
        }
        i += 2;
      }
    }
  }
  return [
    {
      slug: "processing-foundation",
      name: "Processing Foundation",
      tagline: null,
      description:
        "Since 2013, the Processing Foundation Fellowship has supported emerging artists, educators, and coders in imagining more just and equitable relationships with technology.",
      website: "https://processingfoundation.org/",
      repoUrl: null,
      tags: [],
      years: [...new Set(projects.map((p) => p.year))].sort(),
      projects: projects.sort((a, b) => b.year - a.year),
      links: [{ label: "Fellowships", url }],
      sourceUrl: url,
    },
  ];
}

export const PROGRAMS = {
  gsoc: {
    name: "Google Summer of Code",
    collect: gsoc,
    sources: [
      { label: "GSoC organization archive", url: "https://summerofcode.withgoogle.com/archive" },
    ],
    note: "Organizations accepted into GSoC 2022 to 2026, as listed by the GSoC archive.",
  },
  "season-of-docs": {
    name: "Season of Docs",
    collect: seasonOfDocs,
    sources: [
      {
        label: "Season of Docs participants",
        url: "https://developers.google.com/season-of-docs/docs/participants",
      },
    ],
    note: "Organizations that completed Season of Docs projects, 2019 to 2024.",
  },
  outreachy: {
    name: "Outreachy",
    collect: outreachy,
    sources: [
      {
        label: "Outreachy internship rounds (CC BY 3.0)",
        url: "https://www.outreachy.org/past-projects/",
      },
    ],
    note: "Communities listed on the Outreachy round pages for May 2022 to December 2025. The December 2024 round page is not published.",
  },
  "summer-of-bitcoin": {
    name: "Summer of Bitcoin",
    collect: summerOfBitcoin,
    sources: [
      {
        label: "Summer of Bitcoin 2026 organizations",
        url: "https://www.summerofbitcoin.org/organizations",
      },
    ],
    note: "Organizations participating in Summer of Bitcoin 2026. Earlier years are not published as an organization list.",
  },
  "european-summer-of-code": {
    name: "European Summer of Code",
    collect: esoc,
    sources: [
      {
        label: "ESoC 2026 affiliated open source projects",
        url: "https://github.com/european-summer-of-code/esoc2026",
      },
    ],
    note: "Open source projects affiliated with European Summer of Code 2026.",
  },
  ospp: {
    name: "Open Source Promotion Plan",
    collect: ospp,
    sources: [{ label: "OSPP 2026 organizations", url: "https://summer.ospp.ac.cn/org/orglist" }],
    note: "Communities approved for OSPP 2026 so far (OSPP lists organizations in order of approval).",
  },
  c4gt: {
    name: "Code for GovTech",
    collect: c4gt,
    sources: [
      {
        label: "C4GT DMP 2025 tickets",
        url: "https://github.com/Code4GovTech/C4GT/issues?q=label%3A%22DMP+2025%22",
      },
    ],
    note: "Organizations named on Dedicated Mentoring Program 2025 tickets.",
  },
  "mlh-fellowship": {
    name: "MLH Fellowship",
    collect: mlh,
    sources: [{ label: "MLH Fellowship partners", url: "https://fellowship.mlh.io/partners" }],
    note: "Partners shown on the MLH Fellowship partners page. MLH does not publish a list of fellowship projects.",
  },
  igalia: {
    name: "Igalia Coding Experience",
    collect: igalia,
    sources: [
      { label: "Igalia Coding Experience", url: "https://www.igalia.com/coding-experience/" },
    ],
    note: "The Coding Experience is run by Igalia itself; there are no other participating organizations.",
  },
  "processing-foundation": {
    name: "Processing Foundation",
    collect: processing,
    sources: [
      {
        label: "Processing Foundation Fellowships",
        url: "https://processingfoundation.org/fellowships",
      },
    ],
    note: "The Fellowship is run by the Processing Foundation. Fellowship project titles are listed by year; fellows' names are not stored.",
  },
};

async function run(program, known) {
  const def = PROGRAMS[program];
  console.log(`\n== ${program}`);
  let orgs = await def.collect();
  const slugs = new Set();
  for (const o of orgs) {
    // names written only in non-Latin script (e.g. 洛书编程语言社区) get a slug from their website
    if (!o.slug) o.slug = slugify(siteOf(o.website ?? "")?.replace(/\.[a-z]+$/, "") ?? "") || "org";
    while (slugs.has(o.slug)) o.slug = `${o.slug}-2`;
    slugs.add(o.slug);
  }
  orgs = await pool(orgs, 6, (o) => enrich(program, o, program === "gsoc" ? null : known));
  orgs.sort((a, b) => a.name.localeCompare(b.name));
  const years = [...new Set(orgs.flatMap((o) => o.years))].sort();
  const doc = {
    program,
    name: def.name,
    generatedAt: TODAY,
    years,
    note: def.note,
    sources: def.sources,
    orgs,
  };
  fs.writeFileSync(path.join(OUT, `${program}.json`), JSON.stringify(doc, null, 1) + "\n");
  // drop logo files no organization points to any more
  const dir = path.join(LOGOS, program);
  if (fs.existsSync(dir)) {
    const used = new Set(orgs.map((o) => o.logo && path.basename(o.logo)).filter(Boolean));
    for (const f of fs.readdirSync(dir)) if (!used.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  const n = orgs.length;
  const c = (f) => orgs.filter(f).length;
  console.log(
    `${n} orgs | repo ${c((o) => o.repoUrl)} | logo ${c((o) => o.logo)} | chat ${c((o) => o.chats?.length)} | website ${c((o) => o.website)}`,
  );
  return orgs;
}

const wanted = process.argv.slice(2);
const order = Object.keys(PROGRAMS).filter((p) => wanted.length === 0 || wanted.includes(p));
let known = null;
if (!order.includes("gsoc") && fs.existsSync(path.join(OUT, "gsoc.json"))) {
  const g = JSON.parse(fs.readFileSync(path.join(OUT, "gsoc.json"), "utf8"));
  known = new Map(g.orgs.map((o) => [norm(o.name), { ...o, logoFrom: o.logo ? null : null }]));
}
for (const p of order) {
  const orgs = await run(p, known);
  if (p === "gsoc") known = new Map(orgs.map((o) => [norm(o.name), o]));
}
