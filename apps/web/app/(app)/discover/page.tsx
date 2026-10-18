import type { Metadata } from "next";
import { listLfxOrganizations } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved } from "@/lib/saved";
import { many, type Params } from "@/lib/url";
import { PROGRAM_CATALOG, programDef } from "@/lib/programs";
import { CNCF_NAME, lfxFoundations } from "@/lib/lfx-foundations";
import { canonicalTags, cleanTags, isLanguage } from "@/lib/tech-tags";
import { orgEntityId } from "@/lib/org-ids";
import { knowledge } from "@/lib/assistant/engine";
import { normalize, type KnowledgeOrg } from "@/lib/assistant/knowledge";
import { DiscoverClient, type ProgramFacet } from "@/features/discovery/DiscoverClient";
import type { DiscoverOrg } from "@/features/discovery/DiscoveryOrgCard";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

const yearsLabel = (ys: number[]) => {
  const s = [...new Set(ys)].sort();
  if (!s.length) return "";
  return s.length > 1 ? `${s[0]}–${s.at(-1)}` : String(s[0]);
};

/**
 * Discover: pick interests, see matching organizations from every program OpenSourceX records
 * (GSoC, LFX Mentorship, Outreachy, Summer of Bitcoin and the rest). An organization that took
 * part in several programs is one card listing all of them.
 */
export default async function Discover({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  // old links may carry another spelling ("golang"): use the clean tag
  const interests = cleanTags(many(sp.i).flatMap((i) => canonicalTags(i))).slice(0, 8);
  const programsPicked = many(sp.p).slice(0, 20);
  const k = await knowledge();
  // LFX organizations keep their richer database details (terms, sources, saving)
  const lfx = await load((d) => listLfxOrganizations(d));
  const lfxByName = new Map(
    (lfx.ok ? lfx.data.organizations : []).map((o) => [normalize(o.name), o]),
  );
  const saved = await currentSaved();

  const toCard = (o: KnowledgeOrg): DiscoverOrg => {
    const l = lfxByName.get(o.key);
    const programs = o.programs
      .map((e) => {
        const def = programDef(e.program);
        const latest = e.terms?.length ? e.terms.at(-1)! : String(Math.max(...e.years, 0) || "");
        return {
          slug: e.program,
          orgSlug: e.orgSlug,
          name: e.foundation ? `LFX · ${e.foundation}` : (def?.short ?? e.programName),
          fullName: def?.name ?? e.programName,
          href: e.pageUrl,
          years: e.years,
          latest,
        };
      })
      .sort((a, b) => b.latest.localeCompare(a.latest))
      // one pill per program name (an organization can have two GitHub accounts in one foundation)
      .filter((p, i, all) => {
        const first = all.findIndex((x) => x.name === p.name);
        if (first !== i) all[first]!.years = [...all[first]!.years, ...p.years];
        return first === i;
      });
    const primary = programs.find((p) => p.slug === "lfx-mentorship") ?? programs[0]!;
    const years = [...new Set(o.programs.flatMap((e) => e.years))];
    const projectCount = o.programs.reduce((n, e) => n + e.projectCount, 0);
    return {
      id: orgEntityId(primary.slug, primary.orgSlug),
      saveIds: o.programs.map((e) => orgEntityId(e.program, e.orgSlug)),
      name: o.name,
      slug: l?.slug ?? o.lfxSlug ?? o.key.replace(/ /g, "-"),
      programSlug: primary.slug,
      programName: primary.fullName,
      programs: programs.map(({ slug, name, href, latest, years: ys }) => ({
        slug,
        name,
        href,
        latest,
        years: yearsLabel(ys),
      })),
      description: (o.description ?? l?.description ?? null)?.slice(0, 240) ?? null,
      technologies: cleanTags([...(l?.technologies ?? []), ...o.tags]).slice(0, 24),
      topics: cleanTags(o.categories ?? []).slice(0, 8),
      latestTerm: l?.latestTerm ?? primary.latest,
      projectCount: l?.projectCount ?? projectCount,
      yearCount: years.length,
      years,
      repoUrl: o.repoUrl ?? o.githubUrl ?? l?.sampleRepoUrl ?? null,
      href: primary.href,
      logo: o.logo ?? null,
      logoOnDark: o.logoOnDark ?? false,
      source: l?.sources[0],
    };
  };

  const cards = k.orgs.map(toCard);

  // program facets: every program, and each LFX foundation ("LFX · CNCF", "LFX · LFDT", ...).
  // Keys are the program slug, or "lfx-mentorship/<foundation>" for one foundation.
  const programKeys = k.orgs.map((o) => {
    const keys = new Set<string>();
    for (const e of o.programs) {
      keys.add(e.program);
      if (e.foundation) keys.add(`${e.program}/${e.foundation}`);
    }
    return keys;
  });
  const foundationsFile = await lfxFoundations().catch(() => null);
  const foundationShorts = ["CNCF", ...(foundationsFile?.foundations.map((f) => f.short) ?? [])];
  const programFacets: ProgramFacet[] = PROGRAM_CATALOG.flatMap((def) => [
    { key: def.slug, label: def.short },
    ...(def.slug === "lfx-mentorship"
      ? foundationShorts.map((s) => ({
          key: `${def.slug}/${s}`,
          label: `LFX · ${s === "More" ? "More foundations" : s}`,
        }))
      : []),
  ])
    .map((f) => ({
      ...f,
      orgs: programKeys.flatMap((keys, idx) => (keys.has(f.key) ? [idx] : [])),
    }))
    .filter((f) => f.orgs.length > 0);

  // interest facets: one entry per technology/topic, case-insensitive, most common first
  const freq = new Map<string, { label: string; n: number; orgs: Set<number> }>();
  // foundation names (CNCF, LF Decentralized Trust, ...) are program filters, not interests
  const foundationNames = new Set(
    [
      CNCF_NAME,
      "The Linux Foundation",
      ...(foundationsFile?.foundations ?? []).flatMap((f) => [
        f.name,
        ...f.orgs.flatMap((o) => [o.lfProject, ...(o.categories ?? [])]),
      ]),
    ].map((n) => n.toLowerCase()),
  );
  cards.forEach((org, idx) => {
    for (const t of [...org.technologies, ...org.topics]) {
      const key = t.toLowerCase().trim();
      if (!key || key.length > 40 || foundationNames.has(key)) continue;
      const cur = freq.get(key);
      if (!cur) freq.set(key, { label: t, n: 1, orgs: new Set([idx]) });
      else {
        cur.orgs.add(idx);
        cur.n++;
        // prefer a spelling with capitals ("TypeScript" over "typescript")
        if (cur.label === cur.label.toLowerCase() && t !== t.toLowerCase()) cur.label = t;
      }
    }
  });
  const ranked = [...freq.values()].sort(
    (a, b) => b.orgs.size - a.orgs.size || a.label.localeCompare(b.label),
  );
  const facets = ranked.map((f) => f.label);
  // languages and topics are listed apart in the picker
  const facetKinds = ranked.map((f): "language" | "topic" =>
    isLanguage(f.label) ? "language" : "topic",
  );
  // which organizations carry each facet (same order), so the picker can count matches live
  const facetOrgs = ranked.map((f) => [...f.orgs]);
  const savedArr = [...saved].filter((s) => s.startsWith("ORGANIZATION:"));
  // send only matching organizations to the browser (the page re-renders when interests change)
  const wanted = new Set(interests.map((i) => i.toLowerCase().trim()));
  const wantedPrograms = programsPicked.filter((p) => programFacets.some((f) => f.key === p));
  const allOrgs =
    wanted.size || wantedPrograms.length
      ? cards.flatMap((c, idx) =>
          (!wantedPrograms.length || wantedPrograms.some((p) => programKeys[idx]!.has(p))) &&
          (!wanted.size ||
            [...c.technologies, ...c.topics].some((t) => wanted.has(t.toLowerCase().trim())))
            ? [{ ...c, programKeys: [...programKeys[idx]!] }]
            : [],
        )
      : [];

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Discover</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you interested in?
        </h1>
        <p className="sub">
          Pick programs (GSoC, LFX and each LFX foundation like CNCF or LFDT, Outreachy and more),
          languages and technologies. We suggest open source organizations from every program we
          track, with the reasons they match.
        </p>
      </section>

      <DiscoverClient
        allOrgs={allOrgs}
        facets={facets}
        facetKinds={facetKinds}
        initialInterests={interests}
        initialPrograms={wantedPrograms}
        programFacets={programFacets}
        savedSet={savedArr}
        facetOrgs={facetOrgs}
      />
    </div>
  );
}
