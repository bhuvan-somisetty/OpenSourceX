import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { listProjects, listSaved } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { knowledge } from "@/lib/assistant/engine";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { DbDown } from "@/components/feedback/Notice";
import { LogoMark } from "@/components/ui/Logo";
import { ProgramMark } from "@/components/ui/ProgramMark";
import { ProjectRow } from "@/features/projects/ProjectRow";
import { SavedOrgCard } from "@/features/saved/SavedOrgCard";
import { resolveSavedOrg } from "@/lib/saved-orgs";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const PROGRAMS = PROGRAM_CATALOG.slice(0, 10);
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`);

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const icon = (d: ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  programs: icon(
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>,
  ),
  discover: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>,
  ),
  repo: icon(
    <>
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>,
  ),
  interview: icon(
    <>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </>,
  ),
  spark: icon(
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  ),
};

const TILES = [
  {
    href: "/programs",
    icon: ICONS.programs,
    title: "Programs",
    text: "GSoC, LFX, Summer of Bitcoin and more, side by side.",
    tone: "blue",
  },
  {
    href: "/discover",
    icon: ICONS.discover,
    title: "Discover",
    text: "Organizations matched to the skills you already have.",
    tone: "violet",
  },
  {
    href: "/repositories/analyze",
    icon: ICONS.repo,
    title: "Analyze a repository",
    text: "Structure, guidelines and first issues of any GitHub repo.",
    tone: "teal",
  },
  {
    href: "/interview",
    icon: ICONS.interview,
    title: "Interview practice",
    text: "Explain a project in your own words and get feedback.",
    tone: "amber",
  },
];

const STEPS = [
  ["Choose a program", "Compare timelines, stipends and eligibility.", "/programs"],
  ["Find your organization", "Match orgs to your languages and interests.", "/discover"],
  ["Understand the codebase", "Break down the repo before your first PR.", "/repositories/analyze"],
  ["Write a winning proposal", "Ask the AI guide to review your plan.", "/ask"],
];

const STEP_GLOWS = ["ask", "blue", "teal", "amber"];

export default async function AppHome() {
  const session = await requireSession();
  const res = await load(async (d) => ({
    saved: await listSaved(d, session.userId),
    cards: (await listProjects(d)).items,
  }));
  const k = await knowledge().catch(() => null);

  // the newest saved organizations from any program (`org:<program>/<slug>`)
  const recentOrgs = res.ok
    ? (
        await Promise.all(
          res.data.saved
            .filter((r) => r.entityId.startsWith("org:"))
            .slice(0, 3)
            .map((r) => resolveSavedOrg(r.entityId).catch(() => null)),
        )
      ).filter((o) => o !== null)
    : [];
  const byId = new Map(res.ok ? res.data.cards.map((c) => [c.id, c]) : []);
  const recentProjects = res.ok
    ? res.data.saved
        .map((r) => byId.get(r.entityId))
        .filter((c) => !!c)
        .slice(0, 3)
    : [];
  const savedCount = res.ok ? res.data.saved.length : 0;

  const first = session.kind === "guest" ? "" : (session.name.split(/\s+/)[0] ?? "");
  const stats = [
    [String(PROGRAMS.length), "programs"],
    [k ? fmt(k.orgs.length) : "1k+", "organizations"],
    [res.ok ? fmt(res.data.cards.length) : "—", "projects"],
    ["24/7", "AI guide"],
  ];

  return (
    <div className="home">
      <div className="home-aurora" aria-hidden="true">
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
      </div>

      <div className="wrap">
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="hero-eyebrow-pill">
              <span className="hero-eyebrow-dot" aria-hidden="true" />
              <span className="eyebrow">
                {first ? `Welcome back, ${first}` : "Welcome to OpenSourceX"}
              </span>
            </div>
            <h1 className="home-title">
              Your launchpad into <span className="home-gradient">open source</span>.
            </h1>
            <p className="home-sub">
              Every mentorship program, every organization, and an AI guide that knows them all.
              Find where you fit, then make your first contribution count.
            </p>

            <dl className="home-stats">
              {stats.map(([n, l]) => (
                <div key={l} className="home-stat">
                  <dt>{n}</dt>
                  <dd>{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="home-orbit" aria-hidden="true">
            <div className="home-orbit-ring r1" />
            <div className="home-orbit-ring r2" />
            <div className="home-orbit-core">
              <LogoMark size={54} />
            </div>
            <div className="home-orbit-spin">
              {PROGRAMS.map((p, i) => (
                <div key={p.slug} className="home-orbit-item" style={{ ["--i" as string]: i }}>
                  <div className="home-orbit-counter">
                    <ProgramMark slug={p.slug} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="block home-bento" aria-label="Start here">
          <Link href="/ask" className="home-tile home-tile-ask glow-ask">
            <div className="home-tile-icon tone-violet">{ICONS.spark}</div>
            <h2 className="home-tile-title">Ask anything about open source</h2>
            <p className="home-tile-text">
              Prerequisites, stipends, proposals, which org to pick. Answers grounded in real
              program data, with links.
            </p>
            <div className="home-chat" aria-hidden="true">
              <div className="home-chat-q">How do I get selected for GSoC?</div>
              <div className="home-chat-a">
                <span className="home-chat-dot" />
                Pick 1–3 orgs, join their chat early, land a PR, then write a proposal with the
                mentors…
              </div>
            </div>
            <span className="home-tile-cta">
              Start a conversation <Arrow />
            </span>
          </Link>

          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className={`home-tile glow-${t.tone}`}>
              <div className={`home-tile-icon tone-${t.tone}`}>{t.icon}</div>
              <h2 className="home-tile-title">{t.title}</h2>
              <p className="home-tile-text">{t.text}</p>
              <span className="home-tile-cta">
                Open <Arrow />
              </span>
            </Link>
          ))}
        </section>

        {!res.ok ? (
          <DbDown />
        ) : (
          <section className="block" aria-labelledby="cont-h">
            <div className="section-head">
              <h2 id="cont-h">Continue exploring</h2>
              {savedCount > 0 && (
                <Link href="/saved" className="section-link">
                  Saved workspace ({savedCount}) →
                </Link>
              )}
            </div>
            {savedCount === 0 ? (
              <div className="empty-saved-prompt card">
                <div className="empty-saved-icon" aria-hidden="true">
                  ★
                </div>
                <div className="empty-saved-content">
                  <strong>Nothing saved yet</strong>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                    Save organizations from any program while browsing to build your workspace.
                  </p>
                </div>
                <Link href="/programs" className="btn sm primary">
                  Explore Programs
                </Link>
              </div>
            ) : (
              <div style={{ marginTop: 14 }} data-testid="recent-saved">
                {recentOrgs.length > 0 && (
                  <div className="lfx-org-grid" style={{ marginBottom: 14 }}>
                    {recentOrgs.map((o) => (
                      <SavedOrgCard key={o.id} org={o} />
                    ))}
                  </div>
                )}
                {recentProjects.map((c) => (
                  <ProjectRow key={c!.id} p={c!} saved />
                ))}
                <p style={{ marginTop: 16 }}>
                  <Link href="/saved" className="section-link">
                    Open your saved workspace →
                  </Link>
                </p>
              </div>
            )}
          </section>
        )}

        <section className="block home-path-wrap" aria-labelledby="path-h">
          <div className="section-head">
            <h2 id="path-h">From first look to selected</h2>
          </div>
          <ol className="home-path">
            {STEPS.map(([t, d, h], i) => (
              <li key={t}>
                <Link href={h!} className={`home-step glow-${STEP_GLOWS[i]}`}>
                  <span className="home-step-num">{String(i + 1).padStart(2, "0")}</span>
                  <strong>{t}</strong>
                  <span className="muted">{d}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
