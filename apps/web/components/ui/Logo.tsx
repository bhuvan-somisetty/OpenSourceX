import Link from "next/link";
import { useId } from "react";

/**
 * OpenSourceX mark: a solid, tapered bow with the arrow released toward the upper right. Filled
 * shapes with a light-to-accent gradient give it weight and depth (thin strokes read as an icon,
 * not a brand). The bow is the ecosystem, the arrow is your path. Single source for the brand mark;
 * keep the 32x32 viewBox.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  const id = useId();
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
      <defs>
        <linearGradient id={`${id}b`} x1="10" y1="3" x2="24" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}a`} x1="4" y1="16" x2="31" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" stopOpacity="0.75" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g transform="rotate(-45 16 16)">
        <path d="M11 3C27 9 27 23 11 29C20 23 20 9 11 3Z" fill={`url(#${id}b)`} />
        <path
          d="M11 3L7 16L11 29"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 16H26" stroke={`url(#${id}a)`} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M23.5 11L31 16L23.5 21L25.6 16Z" fill={`url(#${id}a)`} />
        <path d="M8 16L4 12.5L6.4 16L4 19.5Z" fill={`url(#${id}a)`} />
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
