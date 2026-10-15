import type { Metadata } from "next";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { ProgramGrid } from "@/features/programs/ProgramGrid";

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
        <ProgramGrid programs={PROGRAM_CATALOG.slice(0, 10)} />
      </section>
    </div>
  );
}
