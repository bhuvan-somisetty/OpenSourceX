"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const icon = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  discover: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16 8 13.5 13.5 8 16 10.5 10.5 16 8" />
    </>,
  ),
  programs: icon(
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>,
  ),
  repos: icon(
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="9" r="2.5" />
      <path d="M6 8.5v7M18 11.5c0 4-6 3-10 5.5" />
    </>,
  ),
  interview: icon(
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </>,
  ),
  ask: icon(
    <>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>,
  ),
};

/**
 * What OpenSourceX gives a contributor, as a fanned hand of playing cards beside the Discover hero.
 * Each card is one feature: what it does and why people use it. Hovering spreads the hand; tapping a
 * card shows it big in the middle of the screen, with more detail and a link to the page. Wide
 * screens only (the hero needs the room).
 */
export function DiscoverFan({ programCount }: { programCount: number }) {
  const cards = [
    {
      key: "programs",
      mark: "P",
      title: "Programs",
      what: `${programCount} mentorship programs, with stipends, timelines and organizations.`,
      why: "Dates and stipends come from each program's official pages.",
      points: [
        "Stipends, from each program's official pages",
        "Timelines and deadlines for each program",
        "Every organization, its years and projects",
      ],
      href: "/programs",
    },
    {
      key: "repos",
      mark: "R",
      title: "Repositories",
      what: "Paste any GitHub link: what it is, how active, how to start.",
      why: "Know a project is alive before you spend weeks on it.",
      points: [
        "What the project is and who it is for",
        "How active it is: contributors and pull requests",
        "Where to start, with evidence and no single score",
      ],
      href: "/repositories",
    },
    {
      key: "discover",
      mark: "D",
      title: "Discover",
      what: "Pick programs and languages; see every organization that fits.",
      why: "One search instead of ten program websites.",
      points: [
        "Filter by program, language and topic",
        "Each LFX foundation on its own (CNCF, LFDT and more)",
        "Save organizations to come back to",
      ],
      href: "/discover",
    },
    {
      key: "interview",
      mark: "I",
      title: "Interview",
      what: "Practice explaining your contribution. Answer first, hints after.",
      why: "Mentors ask you to explain your work, not to recite docs.",
      points: [
        "Questions about your own contribution",
        "Write your answer before you see any hints",
        "Reference material appears only after you submit",
      ],
      href: "/interview",
    },
    {
      key: "ask",
      mark: "A",
      title: "Ask",
      what: "Ask anything about open source; your chats are saved.",
      why: "Get unstuck in minutes, not after days of searching.",
      points: [
        "Questions about programs, organizations and code",
        "Live lookups from free public sources",
        "Your chat history is kept for next time",
      ],
      href: "/ask",
    },
  ] as const;

  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % cards.length));
      if (e.key === "ArrowLeft")
        setOpen((o) => (o === null ? o : (o + cards.length - 1) % cards.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, cards.length]);
  const c = open === null ? null : cards[open]!;

  return (
    <>
      <nav className="discover-fan" aria-label="What OpenSourceX gives you">
        {cards.map((card, i) => (
          <button
            key={card.key}
            type="button"
            className={`play-card fan-${i}`}
            onClick={() => setOpen(i)}
            aria-haspopup="dialog"
          >
            <span className="play-corner" aria-hidden="true">
              {card.mark}
              {ICONS[card.key]}
            </span>
            <span className="play-corner flip" aria-hidden="true">
              {card.mark}
              {ICONS[card.key]}
            </span>
            <span className="play-icon">{ICONS[card.key]}</span>
            <span className="play-title">{card.title}</span>
            <span className="play-what">{card.what}</span>
            <span className="play-why">
              <strong>Why</strong> {card.why}
            </span>
          </button>
        ))}
      </nav>

      {/* the tapped card, big in the middle (in <body>, outside the scaled hand) */}
      {mounted &&
        c &&
        createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(null);
            }}
          >
            <div
              className="play-card play-card-big"
              role="dialog"
              aria-modal="true"
              aria-labelledby="play-big-title"
              key={c.key}
            >
              <span className="play-corner" aria-hidden="true">
                {c.mark}
                {ICONS[c.key]}
              </span>
              <span className="play-corner flip" aria-hidden="true">
                {c.mark}
                {ICONS[c.key]}
              </span>
              <span className="play-icon">{ICONS[c.key]}</span>
              <h2 id="play-big-title" className="play-title">
                {c.title}
              </h2>
              <p className="play-what">{c.what}</p>
              <ul className="play-points">
                {c.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <p className="play-why">
                <strong>Why</strong> {c.why}
              </p>
              <div className="play-actions">
                <button type="button" className="btn sm" onClick={() => setOpen(null)} autoFocus>
                  Close
                </button>
                {c.key === "discover" ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => {
                      setOpen(null);
                      document
                        .querySelector<HTMLButtonElement>("[data-testid=open-interest-picker]")
                        ?.click();
                    }}
                  >
                    Start filtering →
                  </button>
                ) : (
                  <Link href={c.href} className="btn primary sm">
                    Open {c.title} →
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
