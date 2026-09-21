import Link from "next/link";

/**
 * OpenSourceX mark: four wedges converging on a shared centre. The gaps between them draw the X;
 * the wedges are the ecosystem, and the one in accent is the contribution flowing in.
 * Solid shapes only, so it stays crisp from a 16px favicon to a large intro mark.
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
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M7 3h18l-9 9z" fill="currentColor" stroke="currentColor" />
      <path d="M7 29h18l-9-9z" fill="currentColor" stroke="currentColor" />
      <path d="M3 7v18l9-9z" fill="currentColor" stroke="currentColor" />
      <path d="M29 7v18l-9-9z" fill="var(--accent)" stroke="var(--accent)" />
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
