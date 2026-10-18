import Link from "next/link";
import type { ReactNode } from "react";

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
 * Each card is one feature: what it does and why people use it. Hovering spreads the hand; a card
 * opens its page. Wide screens only (the hero needs the room).
 */
export function DiscoverFan({ programCount }: { programCount: number }) {
  const cards = [
    {
      key: "programs",
      mark: "P",
      title: "Programs",
      what: `${programCount} mentorship programs, with stipends, timelines and organizations.`,
      why: "Dates and stipends come from each program's official pages.",
      href: "/programs",
    },
    {
      key: "repos",
      mark: "R",
      title: "Repositories",
      what: "Paste any GitHub link: what it is, how active, how to start.",
      why: "Know a project is alive before you spend weeks on it.",
      href: "/repositories",
    },
    {
      key: "discover",
      mark: "D",
      title: "Discover",
      what: "Pick programs and languages; see every organization that fits.",
      why: "One search instead of ten program websites.",
      href: "/discover",
    },
    {
      key: "interview",
      mark: "I",
      title: "Interview",
      what: "Practice explaining your contribution. Answer first, hints after.",
      why: "Mentors ask you to explain your work, not to recite docs.",
      href: "/interview",
    },
    {
      key: "ask",
      mark: "A",
      title: "Ask",
      what: "Ask anything about open source; your chats are saved.",
      why: "Get unstuck in minutes, not after days of searching.",
      href: "/ask",
    },
  ] as const;

  return (
    <nav className="discover-fan" aria-label="What OpenSourceX gives you">
      {cards.map((c, i) => (
        <Link key={c.key} href={c.href} className={`play-card fan-${i}`}>
          <span className="play-corner" aria-hidden="true">
            {c.mark}
            {ICONS[c.key]}
          </span>
          <span className="play-corner flip" aria-hidden="true">
            {c.mark}
            {ICONS[c.key]}
          </span>
          <span className="play-icon">{ICONS[c.key]}</span>
          <span className="play-title">{c.title}</span>
          <span className="play-what">{c.what}</span>
          <span className="play-why">
            <strong>Why</strong> {c.why}
          </span>
        </Link>
      ))}
    </nav>
  );
}
