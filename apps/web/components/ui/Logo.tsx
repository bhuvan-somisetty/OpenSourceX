import Link from "next/link";

/**
 * OpenSourceX mark: two intersecting paths forming an X, with a node at every end.
 * One path is continuous (the accent), the other passes behind it, so the crossing reads as a connection,
 * not a collision. It stays legible from a 16px favicon to a 48px hero mark.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="logo-svg"
    >
      <path
        d="M25 7 L18.4 13.6 M13.6 18.4 L7 25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M7 7 L25 25" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2.7" fill="var(--accent)" />
      <circle cx="25" cy="25" r="2.7" fill="var(--accent)" />
      <circle cx="25" cy="7" r="2.7" fill="currentColor" />
      <circle cx="7" cy="25" r="2.7" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = 24,
  label = "OpenSourceX home",
}: {
  href?: string;
  size?: number;
  label?: string;
}) {
  return (
    <Link href={href} className="logo" aria-label={label}>
      <LogoMark size={size} />
      <span className="logo-word">
        OpenSource<b>X</b>
      </span>
    </Link>
  );
}
