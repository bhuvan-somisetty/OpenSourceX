import type { Metadata } from "next";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { ProgramGrid } from "@/features/programs/ProgramGrid";
import { LfxTermNotice } from "@/features/lfx/LfxTermNotice";
import { lfxAnnouncement } from "@/lib/lfx-announce";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default async function Programs() {
  const announce = await lfxAnnouncement();
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
      {announce && (
        <div className="lfxn-wrap">
          <LfxTermNotice data={announce} />
        </div>
      )}

      <section className="block" style={{ marginBottom: 40 }}>
        <ProgramGrid programs={PROGRAM_CATALOG.slice(0, 10)} />
      </section>
    </div>
  );
}
