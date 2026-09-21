import { PROGRAM_CATALOG, monogram, programDef } from "@/lib/programs";

/** Typographic program identity. No logos are used: none are licensed for use here. */
export function ProgramMark({ slug, name }: { slug: string; name?: string }) {
  const d = programDef(slug);
  const label = d ? monogram(d) : (name ?? slug).slice(0, 2).toUpperCase();
  return (
    <span className="mark" aria-hidden="true" title={d?.name ?? name}>
      {label}
    </span>
  );
}

export const PROGRAM_SLUGS = PROGRAM_CATALOG.map((p) => p.slug);
