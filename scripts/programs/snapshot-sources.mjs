// Saves a text copy of every official page the program details are taken from, under
// apps/web/data/programs/info/sources/<program>/, and extracts the published per-country
// stipend tables into apps/web/data/programs/info/stipends/<program>.json.
// The copies keep the details checkable even if a program site changes or goes away.
//
// Usage: node scripts/programs/snapshot-sources.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "apps/web/data/programs/info");
const UA = "OpenSourceX-collector/1.0 (+https://opensource-x.vercel.app)";

/** program -> [file name, url, kind] ; kind: md (already text), html, json */
export const SOURCES = {
  gsoc: [
    [
      "stipends.txt",
      "https://developers.google.com/open-source/gsoc/help/student-stipends?hl=en",
      "html",
    ],
    ["faq.txt", "https://developers.google.com/open-source/gsoc/faq?hl=en", "html"],
    ["program-2026.json", "https://summerofcode.withgoogle.com/api/program/2026/", "json"],
  ],
  "lfx-mentorship": [
    [
      "mentee-stipends.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends.md",
      "md",
    ],
    [
      "total-stipend-amount.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends/total-stipend-amount.md",
      "md",
    ],
    [
      "program-timelines.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentorship-program-timelines.md",
      "md",
    ],
    [
      "am-i-eligible.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentee-guide/am-i-eligible.md",
      "md",
    ],
    [
      "how-it-works.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentee-guide/how-mentorship-program-works.md",
      "md",
    ],
    [
      "how-to-apply.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentee-guide/how-to-apply.md",
      "md",
    ],
    [
      "stipend-payment.md",
      "https://docs.linuxfoundation.org/lfx/mentorship/mentees/submit-a-report-to-receive-a-mentorship-stipend.md",
      "md",
    ],
  ],
  outreachy: [
    ["internship.txt", "https://www.outreachy.org/docs/internship/", "html"],
    ["applicant.txt", "https://www.outreachy.org/docs/applicant/", "html"],
  ],
  "summer-of-bitcoin": [
    [
      "what-is-summer-of-bitcoin.md",
      "https://guide.summerofbitcoin.org/about/what-is-summer-of-bitcoin.md",
      "md",
    ],
    ["am-i-eligible.md", "https://guide.summerofbitcoin.org/about/am-i-eligible.md", "md"],
    ["how-it-works.md", "https://guide.summerofbitcoin.org/about/how-it-works.md", "md"],
    [
      "is-it-a-paid-internship.md",
      "https://guide.summerofbitcoin.org/about/is-it-a-paid-internship.md",
      "md",
    ],
  ],
  "european-summer-of-code": [
    [
      "esoc2026-readme.md",
      "https://raw.githubusercontent.com/european-summer-of-code/esoc2026/main/README.md",
      "md",
    ],
  ],
  igalia: [
    [
      "coding-experience-2026-02.txt",
      "https://web.archive.org/web/20260227153651id_/https://www.igalia.com/coding-experience/",
      "html",
    ],
    [
      "coding-experience-2025-03.txt",
      "https://web.archive.org/web/20250315110705id_/https://www.igalia.com/coding-experience/",
      "html",
    ],
  ],
  "processing-foundation": [
    [
      "fellowship-2027.txt",
      "https://processingfoundation.org/programs/fellowships/fellowship-2027",
      "html",
    ],
    ["fellowships.txt", "https://processingfoundation.org/fellowships", "html"],
  ],
  "mlh-fellowship": [
    [
      "faq.txt",
      "https://docs.google.com/document/d/e/2PACX-1vQ4m8tMZKfc9ZvwGXOGJOUkfGHHVpQsaLfwA2Ky1gpjK_8B9jltbs5H8jCfOS_1M-eBGmymiZL_n0TT/pub",
      "html",
    ],
    ["home.txt", "https://fellowship.mlh.io/", "html"],
  ],
  ospp: [
    ["student-guide.txt", "https://blog-en.summer-ospp.ac.cn/archives/student-guide", "html"],
    ["timeline.txt", "https://blog-en.summer-ospp.ac.cn/archives/timeline", "html"],
    ["faq.txt", "https://blog-en.summer-ospp.ac.cn/archives/FAQ", "html"],
  ],
  c4gt: [
    [
      "dmp-2025-project-list.md",
      "https://raw.githubusercontent.com/wiki/Code4GovTech/C4GT/Dedicated-Mentoring-Program-2025-%E2%80%90-Project-List.md",
      "md",
    ],
    [
      "c4gt-mentoring-program.md",
      "https://raw.githubusercontent.com/wiki/Code4GovTech/C4GT/C4GT-Mentoring-Program.md",
      "md",
    ],
    ["home.md", "https://raw.githubusercontent.com/wiki/Code4GovTech/C4GT/Home.md", "md"],
  ],
  "season-of-docs": [["home.txt", "https://developers.google.com/season-of-docs?hl=en", "html"]],
};

function htmlToText(html) {
  return html
    .replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi,
      "",
    )
    .replace(/<\/(p|li|h[1-6]|tr|div|section|article|br)>|<br\s*\/?>/gi, "\n")
    .replace(/<(td|th)[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, "accept-language": "en" },
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) return await res.text();
    } catch {}
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

/** Rows of the first markdown table that has `Country` in its header. */
function mdCountryTable(md) {
  const rows = md
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && !/^\|\s*-/.test(l.trim()))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.replace(/\*/g, "").trim()),
    );
  const start = rows.findIndex((r) => /country/i.test(r[0] ?? ""));
  return start < 0 ? [] : rows.slice(start + 1).filter((r) => r[0] && r[1]);
}
const usd = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

const checked = new Date().toISOString().slice(0, 10);
const stipendDir = path.join(DIR, "stipends");
fs.mkdirSync(stipendDir, { recursive: true });

for (const [program, list] of Object.entries(SOURCES)) {
  const dir = path.join(DIR, "sources", program);
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, url, kind] of list) {
    const body = await get(url);
    if (body == null) {
      console.log(`!! ${program}/${file}: could not fetch ${url}`);
      continue;
    }
    const text = kind === "html" ? htmlToText(body) : body;
    fs.writeFileSync(path.join(dir, file), `Source: ${url}\nRetrieved: ${checked}\n\n${text}\n`);
    console.log(`ok ${program}/${file} (${text.length} chars)`);

    // per-country stipend tables, exactly as published
    if (program === "gsoc" && file === "stipends.txt") {
      const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
        .map((m) =>
          [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => htmlToText(c[1])),
        )
        .filter((r) => r.length === 4 && !/country/i.test(r[0]));
      const table = rows.map(([country, s, m, l]) => ({
        country,
        small: usd(s),
        medium: usd(m),
        large: usd(l),
      }));
      fs.writeFileSync(
        path.join(stipendDir, "gsoc.json"),
        JSON.stringify(
          {
            source: url,
            retrieved: checked,
            currency: "USD",
            columns: ["small", "medium", "large"],
            rows: table,
          },
          null,
          1,
        ) + "\n",
      );
    }
    if (program === "lfx-mentorship" && file === "total-stipend-amount.md") {
      const table = mdCountryTable(body).map(([country, amount]) => ({
        country,
        amount: usd(amount),
      }));
      fs.writeFileSync(
        path.join(stipendDir, "lfx-mentorship.json"),
        JSON.stringify(
          {
            source: url.replace(/\.md$/, ""),
            retrieved: checked,
            currency: "USD",
            columns: ["amount"],
            rows: table,
          },
          null,
          1,
        ) + "\n",
      );
    }
    if (program === "summer-of-bitcoin" && file === "is-it-a-paid-internship.md") {
      const table = mdCountryTable(body).map(([country, amount]) => ({
        country,
        amount: usd(amount),
      }));
      fs.writeFileSync(
        path.join(stipendDir, "summer-of-bitcoin.json"),
        JSON.stringify(
          {
            source: url.replace(/\.md$/, ""),
            retrieved: checked,
            currency: "USD",
            paidIn: "BTC",
            columns: ["amount"],
            rows: table,
          },
          null,
          1,
        ) + "\n",
      );
    }
  }
}
