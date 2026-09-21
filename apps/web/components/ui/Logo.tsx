import Link from "next/link";

/**
 * OpenSourceX mark: a drawn bow with the arrow released toward the upper right. The bow and string
 * are the ecosystem, the arrow is your path, and the head carries the accent. Single source for the
 * brand mark; keep the 32x32 viewBox.
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
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="rotate(-45 16 16)">
        <path d="M12 4Q26 16 12 28" stroke="currentColor" />
        <path d="M12 4L8 16L12 28" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 16H29" stroke="currentColor" />
        <path d="M24 11L29 16L24 21" stroke="var(--accent)" />
      </g>
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
