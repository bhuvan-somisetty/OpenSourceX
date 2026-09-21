"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/features/auth/actions";
import { Logo } from "@/components/ui/Logo";

export const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/programs", label: "Programs" },
  { href: "/projects", label: "Projects" },
  { href: "/saved", label: "Saved" },
  { href: "/repositories/analyze", label: "Repositories" },
  { href: "/interview", label: "Interview" },
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
      /* storage may be unavailable; the theme still applies for this visit */
    }
  }
  return (
    <button
      type="button"
      className="btn icon-btn sm"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      data-testid="theme-toggle"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}

function ProfileMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="avatar"
        aria-label="Profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        data-testid="profile-button"
      >
        {name[0]}
      </button>
      {open && (
        <div className="menu-pop" role="menu" data-testid="profile-menu">
          <div className="who">
            <strong>{name}</strong>
            <div className="hint">Development session, not a real account</div>
          </div>
          <Link href="/saved" role="menuitem">
            Saved
          </Link>
          <Link href="/sources" role="menuitem">
            Sources and status
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" data-testid="sign-out">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Header({ userName }: { userName: string }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="app">
      <div className="wrap bar">
        <Logo href="/app" size={24} />
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
        <form action="/projects" role="search" className="hsearch">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor="global-q" className="skip">
            Search projects
          </label>
          <input id="global-q" type="search" name="q" placeholder="Search projects" />
        </form>
        <ThemeToggle />
        <ProfileMenu name={userName} />
        <button
          type="button"
          className="btn menu-btn sm"
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
            <form action="/projects" role="search" style={{ padding: "14px 0" }}>
              <label htmlFor="m-q" className="skip">
                Search projects
              </label>
              <input id="m-q" type="search" name="q" placeholder="Search projects" />
            </form>
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
