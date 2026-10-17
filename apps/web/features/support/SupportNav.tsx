"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Help & support sidebar. "Staff" appears only for support staff. */
export function SupportNav({ openCount, staff }: { openCount: number | null; staff: boolean }) {
  const path = usePathname() ?? "";
  const items = [
    {
      href: "/support",
      label: "Report a problem",
      icon: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
    },
    {
      href: "/support/complaints",
      label: "My complaints",
      icon: "M4 6h16M4 12h16M4 18h10",
      count: openCount,
    },
    ...(staff
      ? [
          {
            href: "/support/staff",
            label: "Staff: all reports",
            icon: "M12 3 4 6v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V6l-8-3Z",
          },
        ]
      : []),
  ];
  return (
    <nav className="support-nav" aria-label="Help and support">
      {items.map((it) => {
        const active = it.href === "/support" ? path === "/support" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={it.icon}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{it.label}</span>
            {"count" in it && it.count ? <span className="support-count">{it.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
