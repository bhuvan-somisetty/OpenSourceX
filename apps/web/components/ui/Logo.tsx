import Link from "next/link";

/**
 * TEMPORARY placeholder mark. The final OpenSourceX logo is supplied separately: replace the
 * contents of `LogoMark` (and `app/icon.svg`) and every place that shows the brand updates,
 * including the intro stage, with no layout change. Keep the 32x32 viewBox.
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
      <rect x="3" y="3" width="26" height="26" rx="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.2" fill="var(--accent)" />
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
