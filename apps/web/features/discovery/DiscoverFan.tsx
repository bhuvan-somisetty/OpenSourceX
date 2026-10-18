import Link from "next/link";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import type { DiscoverOrg } from "@/features/discovery/DiscoveryOrgCard";

/**
 * Three real organizations as a fanned hand of cards beside the Discover hero. Hovering spreads
 * them; each card opens its organization. Wide screens only (the hero needs the room).
 */
export function DiscoverFan({ orgs }: { orgs: DiscoverOrg[] }) {
  if (orgs.length < 3) return null;
  return (
    <div className="discover-fan" aria-label="Organizations you can find here">
      {orgs.slice(0, 3).map((o, i) => (
        <Link key={o.id} href={o.href} className={`discover-fan-card fan-${i}`}>
          <div className="discover-fan-top">
            {o.logo ? (
              <ProgramOrgLogo src={o.logo} name={o.name} size={44} dark={o.logoOnDark} />
            ) : (
              <OrgLogo slug={o.slug} name={o.name} size={44} />
            )}
            <div style={{ minWidth: 0 }}>
              <div className="discover-fan-name">{o.name}</div>
              <div className="discover-fan-years">
                {o.yearCount} year{o.yearCount === 1 ? "" : "s"} of mentoring
              </div>
            </div>
          </div>
          <div className="discover-fan-pills">
            {(o.programs ?? []).slice(0, 3).map((p) => (
              <span key={`${p.slug}:${p.name}`} className="pill">
                {p.name}
              </span>
            ))}
          </div>
          {o.description && <p className="discover-fan-desc">{o.description}</p>}
          <div className="discover-fan-tags">
            {o.technologies.slice(0, 3).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
