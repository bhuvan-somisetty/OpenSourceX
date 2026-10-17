import type { Metadata } from "next";
import { listLfxOrganizations } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved } from "@/lib/saved";
import { many, type Params } from "@/lib/url";
import { programDef } from "@/lib/programs";
import { knowledge } from "@/lib/assistant/engine";
import { normalize, type KnowledgeOrg } from "@/lib/assistant/knowledge";
import { DiscoverClient } from "@/features/discovery/DiscoverClient";
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
  const interests = many((await searchParams).i).slice(0, 8);
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
          name: def?.short ?? e.programName,
          fullName: def?.name ?? e.programName,
          href: e.pageUrl,
          years: e.years,
          latest,
        };
      })
      .sort((a, b) => b.latest.localeCompare(a.latest));
    const primary = programs.find((p) => p.slug === "lfx-mentorship") ?? programs[0]!;
    const years = [...new Set(o.programs.flatMap((e) => e.years))];
    const projectCount = o.programs.reduce((n, e) => n + e.projectCount, 0);
    return {
      id: l ? `lfx-${l.slug}` : `${primary.slug}:${o.key.replace(/ /g, "-")}`,
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
      technologies: [...new Set([...(l?.technologies ?? []), ...o.tags])].slice(0, 24),
      topics: (o.categories ?? []).slice(0, 8),
      latestTerm: l?.latestTerm ?? primary.latest,
      projectCount: l?.projectCount ?? projectCount,
      yearCount: years.length,
      years,
      repoUrl: o.repoUrl ?? o.githubUrl ?? l?.sampleRepoUrl ?? null,
      href: primary.href,
      logo: o.logo ?? null,
      logoOnDark: o.logoOnDark ?? false,
      saveable: Boolean(l),
      source: l?.sources[0],
    };
  };

  const cards = k.orgs.map(toCard);

  // interest facets: one entry per technology/topic, case-insensitive, most common first
  const freq = new Map<string, { label: string; n: number }>();
  for (const org of cards)
    for (const t of [...org.technologies, ...org.topics]) {
      const key = t.toLowerCase().trim();
      if (!key || key.length > 40) continue;
      const cur = freq.get(key);
      if (!cur) freq.set(key, { label: t, n: 1 });
      else {
        cur.n++;
        // prefer a spelling with capitals ("TypeScript" over "typescript")
        if (cur.label === cur.label.toLowerCase() && t !== t.toLowerCase()) cur.label = t;
      }
    }
  const facets = [...freq.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .map((f) => f.label);
  const savedArr = [...saved].filter((s) => s.startsWith("ORGANIZATION:"));
  // send only matching organizations to the browser (the page re-renders when interests change)
  const wanted = new Set(interests.map((i) => i.toLowerCase()));
  const allOrgs = wanted.size
    ? cards.filter((c) => [...c.technologies, ...c.topics].some((t) => wanted.has(t.toLowerCase())))
    : [];

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Discover</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you interested in?
        </h1>
        <p className="sub">
          Pick your preferred languages and technologies. We suggest open source organizations from
          every program we track (GSoC, LFX Mentorship, Outreachy, Summer of Bitcoin and more), with
          the reasons they match.
        </p>
      </section>

      <DiscoverClient
        allOrgs={allOrgs}
        facets={facets}
        initialInterests={interests}
        savedSet={savedArr}
      />
    </div>
  );
}
