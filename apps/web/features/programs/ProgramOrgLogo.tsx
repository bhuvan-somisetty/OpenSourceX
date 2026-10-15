import { getOrgInitials } from "@/lib/orgs";

/** An organization's logo from public/logos/programs, or its initials when none was published. */
export function ProgramOrgLogo({
  src,
  name,
  size = 52,
  dark = false,
}: {
  src: string | null;
  name: string;
  size?: number;
  dark?: boolean;
}) {
  const style = { width: size, height: size, minWidth: size, borderRadius: Math.max(8, Math.round(size * 0.2)) };
  if (!src) {
    return (
      <span className="porg-logo porg-logo-mono" style={{ ...style, fontSize: Math.round(size * 0.34) }} aria-hidden="true">
        {getOrgInitials(name)}
      </span>
    );
  }
  return (
    <span className={`porg-logo${dark ? " porg-logo-dark" : ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static files of mixed formats, sized by CSS */}
      <img src={src} alt={`${name} logo`} loading="lazy" decoding="async" />
    </span>
  );
}
