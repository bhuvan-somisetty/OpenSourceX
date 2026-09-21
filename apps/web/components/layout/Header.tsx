"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/programs", label: "Programs" },
  { href: "/projects", label: "Projects" },
  { href: "/repositories/analyze", label: "Repositories" },
  { href: "/interview", label: "Interview" },
  { href: "/sources", label: "Sources" },
] as const;

const active = (path: string, href: string) =>
  path.startsWith(href.split("/").slice(0, 2).join("/"));

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    setTheme(
      t === "light" || (!t && window.matchMedia("(prefers-color-scheme: light)").matches)
        ? "light"
        : "dark",
    );
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("osx-theme", next);
    } catch {
      /* storage may be unavailable; theme still applies for this visit */
    }
  }
  return (
    <button
      type="button"
      className="btn icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      data-testid="theme-toggle"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}

export function Header() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="top">
      <div className="wrap bar">
        <Link href="/" className="logo" aria-label="OpenSourceX home">
          OpenSource<span>X</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(path, n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="grow" />
        <ThemeToggle />
        <button
          type="button"
          className="btn menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          data-testid="menu-button"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" className="menu-panel" aria-label="Mobile" data-testid="mobile-menu">
          <div className="wrap">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(path, n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
