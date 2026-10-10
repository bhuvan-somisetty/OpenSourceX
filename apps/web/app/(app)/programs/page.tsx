import Link from "next/link";
import type { Metadata } from "next";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { ProgramMark } from "@/components/ui/ProgramMark";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default function Programs() {
  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Programs</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Where do you want to contribute?
        </h1>
        <p className="sub">
          Choose a program to explore its organizations, projects, history and contribution paths.
        </p>
      </section>

      <section className="block" style={{ marginBottom: 40 }}>
        <div className="program-square-grid">
          {PROGRAM_CATALOG.slice(0, 10).map((d) => (
            <Link
              key={d.slug}
              href={`/programs/${d.slug}`}
              className="card hover program-card"
            >
              <ProgramMark slug={d.slug} />
              <div className="program-card-meta">
                <strong className="program-card-title">{d.name}</strong>
                <span className="dim program-card-tagline">{d.tagline}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
