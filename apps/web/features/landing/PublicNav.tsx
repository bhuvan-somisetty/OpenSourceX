"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";

/** Short, true descriptions. The landing is one screen, so these open in a sheet instead of long sections. */
const PANELS = {
  product: {
    label: "Product",
    title: "Intelligence for open source",
    body: "OpenSourceX connects programs, organizations, projects and repositories, and shows the evidence behind every fact, so you can decide where to contribute and understand how.",
  },
  programs: {
    label: "Programs",
    title: "Choose a program, explore its ecosystem",
    body: "Google Summer of Code and LFX Mentorship have recorded data in this build. Other programs are configured and appear as soon as they have data.",
  },
  how: {
    label: "How it works",
    title: "Source, evidence, provenance",
    body: "Every fact keeps where it came from, when it was recorded, and how sure we are. Nothing is scored behind your back, and unknowns are shown as unknown.",
  },
  about: {
    label: "About",
    title: "A local development build",
    body: "This build runs on recorded, sanitized snapshots. Nothing is live, and sign-in is a local preview session, not a real account.",
  },
} as const;
type Key = keyof typeof PANELS;
const ORDER: Key[] = ["product", "programs", "how", "about"];

export function PublicNav() {
  const [panel, setPanel] = useState<Key | null>(null);
  const [menu, setMenu] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setPanel(null), setMenu(false));
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  useEffect(() => {
    if (panel) closeRef.current?.focus();
  }, [panel]);
  const open = (k: Key) => {
    setMenu(false);
    setPanel(k);
  };
  const p = panel ? PANELS[panel] : null;

  return (
    <>
      <header className="l-nav">
        <div className="wrap in">
          <Logo size={26} />
          <nav className="links" aria-label="Site">
            {ORDER.map((k) => (
              <button key={k} type="button" onClick={() => open(k)} data-testid={`nav-${k}`}>
                {PANELS[k].label}
              </button>
            ))}
          </nav>
          <span style={{ flex: 1 }} />
          <Link className="btn sm signin" href="/login" data-testid="nav-signin">
            Sign in
          </Link>
          <button
            type="button"
            className="btn sm menu-toggle"
            aria-expanded={menu}
            aria-controls="pub-menu"
            onClick={() => setMenu((m) => !m)}
            data-testid="pub-menu-button"
          >
            {menu ? "Close" : "Menu"}
          </button>
        </div>
        {menu && (
          <nav id="pub-menu" className="pub-menu" aria-label="Site menu" data-testid="pub-menu">
            <div className="wrap">
              {ORDER.map((k) => (
                <button key={k} type="button" onClick={() => open(k)}>
                  {PANELS[k].label}
                </button>
              ))}
              <Link href="/login" className="btn primary" style={{ width: "100%" }}>
                Sign in
              </Link>
            </div>
          </nav>
        )}
      </header>

      {p && (
        <div className="sheet-backdrop" onClick={() => setPanel(null)} data-testid="sheet-backdrop">
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-h"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet"
          >
            <div className="eyebrow">{p.label}</div>
            <h2 id="sheet-h">{p.title}</h2>
            <p className="muted">{p.body}</p>
            <div className="actions" style={{ marginTop: 22 }}>
              <Link className="btn primary sm" href="/login">
                Get started
              </Link>
              <button
                ref={closeRef}
                type="button"
                className="btn sm"
                onClick={() => setPanel(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
