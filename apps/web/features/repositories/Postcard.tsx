"use client";

import { useState } from "react";
import type { RepoAnalysis } from "@/lib/repo-analysis";

const W = 1200;
const H = 630;

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

const LANG_COLORS = ["#046a38", "#e34222", "#0c8d52", "#f2a33a", "#8a6f4e", "#b8a58a"];

const ACTIVITY: Record<string, string> = {
  archived: "Archived",
  active: "Active",
  steady: "Steady",
  slowing: "Slowing",
  quiet: "Quiet",
  inactive: "Inactive",
};

/** wrap text to a width, at most `max` lines, with an ellipsis on the last */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
      if (lines.length === max) break;
    } else line = next;
  }
  if (lines.length < max && line) lines.push(line);
  if (lines.length === max && words.join(" ") !== lines.join(" ")) {
    let last = lines[max - 1]!;
    while (ctx.measureText(`${last}…`).width > width && last.length) last = last.slice(0, -1);
    lines[max - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, family: string) {
  ctx.font = `600 22px ${family}`;
  const w = ctx.measureText(text).width + 32;
  ctx.fillStyle = "rgba(4,106,56,0.07)";
  ctx.strokeStyle = "rgba(4,106,56,0.32)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 42, 21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17261c";
  ctx.fillText(text, x + 16, y + 29);
  return w;
}

/** Draw the repository as a 1200×630 postcard (the size social sites preview). */
export async function drawPostcard(a: RepoAnalysis): Promise<Blob> {
  await document.fonts.ready;
  const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  // warm ivory, emerald green and vermilion: a postcard, not a dark screen
  const accent = "#046a38";
  const accent2 = "#e34222";
  const rec = "#e34222";

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const font = (f: string) => (ctx.font = f.replace("var(--pc-font)", family));

  // background: deep navy with two soft glows
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fbf2e4");
  bg.addColorStop(1, "#f3e1c7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, col] of [
    [140, 40, 520, accent],
    [1080, 600, 480, accent2],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${col}1f`);
    g.addColorStop(1, `${col}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // card edge
  ctx.strokeStyle = "rgba(4,106,56,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 28);
  ctx.stroke();

  // postcard divider
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "rgba(4,106,56,0.3)";
  ctx.beginPath();
  ctx.moveTo(830, 90);
  ctx.lineTo(830, H - 90);
  ctx.stroke();
  ctx.setLineDash([]);

  // left: the message
  const L = 72;
  font("700 20px var(--pc-font)");
  ctx.fillStyle = accent2;
  ctx.fillText("REPOSITORY REPORT", L, 104);

  font("800 56px var(--pc-font)");
  ctx.fillStyle = accent;
  const title = wrap(ctx, a.repository, 700, 2);
  title.forEach((t, i) => ctx.fillText(t, L, 172 + i * 62));
  let y = 172 + (title.length - 1) * 62 + 52;

  if (a.about.description) {
    font("400 26px var(--pc-font)");
    ctx.fillStyle = "#4a3f31";
    for (const t of wrap(ctx, a.about.description, 700, 3)) {
      ctx.fillText(t, L, y);
      y += 38;
    }
  }

  y += 14;
  let x = L;
  for (const p of [
    a.about.mainLanguage,
    `★ ${fmt(a.about.stars)}`,
    `${fmt(a.about.forks)} forks`,
    a.about.license,
  ]) {
    if (!p) continue;
    const w = pill(ctx, x, y, p, family);
    x += w + 12;
    if (x > 760) break;
  }
  y += 82;

  const act = a.activity.ok ? a.activity.data : null;
  if (act) {
    font("700 22px var(--pc-font)");
    ctx.fillStyle = rec;
    const label = ACTIVITY[act.status] ?? act.status;
    ctx.fillText(label, L, y);
    const lw = ctx.measureText(label).width;
    font("400 22px var(--pc-font)");
    ctx.fillStyle = "#3d3528";
    ctx.fillText(
      `· ${fmt(act.commits90d)}${act.commitsCapped ? "+" : ""} commits, ${fmt(act.mergedPulls90d)} PRs merged in 90 days`,
      L + lw + 10,
      y,
    );
    y += 36;
  }
  const iss = a.issues.ok ? a.issues.data : null;
  if (iss?.goodFirstIssues) {
    font("400 22px var(--pc-font)");
    ctx.fillStyle = "#3d3528";
    ctx.fillText(`${fmt(iss.goodFirstIssues)} open good first issues`, L, y);
  }

  // language bar along the bottom
  const langs = a.languages.ok ? a.languages.data.filter((l) => l.share >= 1).slice(0, 6) : [];
  if (langs.length) {
    const total = langs.reduce((s, l) => s + l.share, 0) || 1;
    let bx = L;
    const bw = 700;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(L, H - 108, bw, 10, 5);
    ctx.clip();
    langs.forEach((l, i) => {
      const w = (l.share / total) * bw;
      ctx.fillStyle = LANG_COLORS[i % LANG_COLORS.length]!;
      ctx.fillRect(bx, H - 108, w + 1, 10);
      bx += w;
    });
    ctx.restore();
    font("500 18px var(--pc-font)");
    let lx = L;
    langs.slice(0, 4).forEach((l, i) => {
      ctx.fillStyle = LANG_COLORS[i % LANG_COLORS.length]!;
      ctx.beginPath();
      ctx.arc(lx + 6, H - 72, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b5a44";
      const t = `${l.name} ${Math.round(l.share)}%`;
      ctx.fillText(t, lx + 18, H - 66);
      lx += ctx.measureText(t).width + 40;
    });
  }

  // right: stamp
  const sx = W - 72 - 120;
  const sy = 80;
  ctx.fillStyle = "#fffaf2";
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    ctx.arc(sx + i * 10, sy, 4, 0, Math.PI * 2);
    ctx.arc(sx + i * 10, sy + 140, 4, 0, Math.PI * 2);
  }
  for (let i = 0; i <= 14; i++) {
    ctx.arc(sx, sy + i * 10, 4, 0, Math.PI * 2);
    ctx.arc(sx + 120, sy + i * 10, 4, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillRect(sx, sy, 120, 140);
  const sg = ctx.createLinearGradient(sx, sy, sx + 120, sy + 140);
  sg.addColorStop(0, "#ff6a45");
  sg.addColorStop(0.6, accent2);
  sg.addColorStop(1, "#b92f14");
  ctx.fillStyle = sg;
  ctx.fillRect(sx + 10, sy + 10, 100, 120);
  font("900 30px var(--pc-font)");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("OSX", sx + 60, sy + 82);

  // postmark over the stamp's corner
  const when = new Date(a.fetchedAt);
  const px = sx - 92;
  const py = sy + 172;
  ctx.strokeStyle = "rgba(227,66,34,0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, 58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(227,66,34,0.9)";
  font("700 15px var(--pc-font)");
  ctx.fillText("ANALYZED", px, py - 14);
  font("800 17px var(--pc-font)");
  ctx.fillText(
    when
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase(),
    px,
    py + 8,
  );
  font("600 15px var(--pc-font)");
  ctx.fillText(
    when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    px,
    py + 28,
  );
  ctx.textAlign = "left";

  // address lines
  font("600 16px var(--pc-font)");
  ctx.fillStyle = "#8a6f4e";
  ctx.fillText("TO", 880, 340);
  font("600 24px var(--pc-font)");
  ctx.fillStyle = "#17261c";
  for (const [i, t] of ["Every open source", "contributor"].entries()) {
    ctx.fillText(t, 880, 378 + i * 34);
  }
  ctx.strokeStyle = "rgba(4,106,56,0.25)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(880, 392 + i * 34);
    ctx.lineTo(W - 72, 392 + i * 34);
    ctx.stroke();
  }

  // signature
  font("800 26px var(--pc-font)");
  ctx.fillStyle = accent;
  ctx.fillText("OpenSourceX", 880, H - 96);
  font("400 18px var(--pc-font)");
  ctx.fillStyle = "#6b5a44";
  ctx.fillText(window.location.host, 880, H - 66);

  return new Promise((ok, fail) =>
    c.toBlob((b) => (b ? ok(b) : fail(new Error("canvas"))), "image/png"),
  );
}

const fileName = (a: RepoAnalysis) => `${a.repository.replace("/", "-")}-postcard.png`;

/** Download, share (where the browser can share files) or post the analysis link. */
export function PostcardActions({ a, compact = false }: { a: RepoAnalysis; compact?: boolean }) {
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [note, setNote] = useState<string | null>(null);
  const link = () =>
    `${window.location.origin}/repositories/analyze?repo=${encodeURIComponent(a.repository)}`;
  const text = `${a.repository}: what it is, how active it is and how to start contributing`;

  const download = async () => {
    setBusy("download");
    try {
      const url = URL.createObjectURL(await drawPostcard(a));
      const el = document.createElement("a");
      el.href = url;
      el.download = fileName(a);
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNote("Postcard saved");
    } catch {
      setNote("Could not draw the postcard");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const file = new File([await drawPostcard(a)], fileName(a), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: a.repository, text, url: link() });
      } else {
        await download();
        setNote("Saved. Attach it to your post");
      }
    } catch {
      /* the share sheet was closed */
    } finally {
      setBusy(null);
    }
  };

  const enc = encodeURIComponent;
  return (
    <div className={`pc-actions${compact ? " pc-compact" : ""}`} data-testid="postcard-actions">
      <button
        type="button"
        className="pc-btn pc-main"
        onClick={() => void download()}
        disabled={!!busy}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"
          />
        </svg>
        {busy === "download" ? "Drawing…" : "Postcard"}
      </button>
      <button type="button" className="pc-btn" onClick={() => void share()} disabled={!!busy}>
        {busy === "share" ? "Drawing…" : "Share"}
      </button>
      <a
        className="pc-btn"
        href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(typeof window === "undefined" ? "" : link())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Post on X"
      >
        X
      </a>
      <a
        className="pc-btn"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(typeof window === "undefined" ? "" : link())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Post on LinkedIn"
      >
        in
      </a>
      {note && (
        <span className="pc-note" role="status">
          {note}
        </span>
      )}
    </div>
  );
}
