import Link from "next/link";

/**
 * OpenSourceX mark: a Sagittarius-style arrow (the archer's glyph) reduced to a geometric symbol.
 * An arrow flies up and to the right, and a short crossbar marks the draw. The head carries the
 * accent: the direction you are heading. Single source for the brand mark; keep the 32x32 viewBox.
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
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 26L26 6" stroke="currentColor" />
      <path d="M8 16.5l7.5 7.5" stroke="currentColor" />
      <path d="M13.5 6H26v12.5" stroke="var(--accent)" />
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
      <span className="logo-word">OpenSourceX</span>
    </Link>
  );
}
