"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type MouseEvent } from "react";
import type { ProgramDef } from "@/lib/programs";
import { ProgramMark } from "@/components/ui/ProgramMark";

/** Every program plays a logo launch; each one's motion is styled by `.launch-<slug>` in globals.css. */
const LAUNCH_MS = 2400;
const PARTS = Array.from({ length: 12 }, (_, i) => i);

type Launch = { def: ProgramDef; style: CSSProperties };

/**
 * Program cards. A launch-enabled card lifts its logo to the centre of the screen,
 * fires a short burst, then zooms through into the program page.
 */
export function ProgramGrid({ programs }: { programs: ProgramDef[] }) {
  const router = useRouter();
  const [launch, setLaunch] = useState<Launch | null>(null);

  const onClick = (e: MouseEvent<HTMLAnchorElement>, def: ProgramDef) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const href = `/programs/${def.slug}`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
    if (launch) return;
    router.prefetch(href);
    const mark = e.currentTarget.querySelector(".mark");
    if (!mark) return router.push(href);
    const r = mark.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (r.left + r.width / 2);
    const dy = window.innerHeight / 2 - (r.top + r.height / 2);
    setLaunch({
      def,
      style: {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        ["--dx" as string]: `${dx}px`,
        ["--dy" as string]: `${dy}px`,
      },
    });
    window.setTimeout(() => router.push(href), LAUNCH_MS);
  };

  return (
    <>
      <div className={`program-square-grid${launch ? " launching" : ""}`}>
        {programs.map((d) => (
          <Link
            key={d.slug}
            href={`/programs/${d.slug}`}
            className={`card hover program-card${launch?.def.slug === d.slug ? " launched" : ""}`}
            onClick={(e) => onClick(e, d)}
          >
            <ProgramMark slug={d.slug} />
            <div className="program-card-meta">
              <strong className="program-card-title">{d.name}</strong>
              <span className="dim program-card-tagline">{d.tagline}</span>
            </div>
          </Link>
        ))}
      </div>
      {launch && (
        <div className={`program-launch launch-${launch.def.slug}`} aria-hidden="true">
          <div className="program-launch-bg" />
          <div className="program-launch-fly" style={launch.style}>
            <i className="launch-halo" />
            <i className="launch-ring r1" />
            <i className="launch-ring r2" />
            <i className="launch-flash" />
            <span className="launch-parts">
              {PARTS.map((i) => (
                <i key={i} className="launch-p" style={{ ["--i" as string]: i }}>
                  <b />
                </i>
              ))}
            </span>
            <i className="launch-orbit" />
            <ProgramMark slug={launch.def.slug} />
            <i className="launch-scan" />
          </div>
          <div className="program-launch-name">{launch.def.name}</div>
        </div>
      )}
    </>
  );
}
