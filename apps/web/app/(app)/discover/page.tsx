import type { Metadata } from "next";
import { listProjects, listLfxOrganizations } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved } from "@/lib/saved";
import { many, type Params } from "@/lib/url";
import { DbDown } from "@/components/feedback/Notice";
import { DiscoverClient } from "@/features/discovery/DiscoverClient";
import type { DiscoverOrg } from "@/features/discovery/DiscoveryOrgCard";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

/** Discover: intent -> filter -> exploration of active participating organizations */
export default async function Discover({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const interests = many(sp.i).slice(0, 8);
  const res = await load(async (d) => ({
    all: await listProjects(d),
    lfxOrgs: await listLfxOrganizations(d),
  }));
  const saved = await currentSaved();

  if (!res.ok) {
    return (
      <div className="wrap">
        <DbDown />
      </div>
    );
  }

  // Build organization list
  const lfxList: DiscoverOrg[] = res.data.lfxOrgs.organizations.map((org) => ({
    id: `lfx-${org.slug}`,
    name: org.name,
    slug: org.slug,
    programSlug: "lfx-mentorship",
    programName: "LFX Mentorship",
    description: org.description,
    technologies: org.technologies,
    topics: [],
    latestTerm: org.latestTerm,
    projectCount: org.projectCount,
    yearCount: org.yearCount,
    years: org.years,
    repoUrl: org.sampleRepoUrl,
    href: `/programs/lfx-mentorship/organizations/${org.slug}`,
    source: org.sources[0],
  }));

  const gsocList: DiscoverOrg[] = res.data.all.items
    .filter((p) => p.kind === "organization")
    .map((p) => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return {
        id: p.id,
        name: p.name,
        slug,
        programSlug: p.program.slug,
        programName: p.program.name,
        description: p.summary,
        technologies: p.technologies,
        topics: p.topics,
        latestTerm: p.terms[p.terms.length - 1] ?? p.terms[0] ?? "",
        projectCount: p.terms.length,
        yearCount: p.terms.length,
        years: p.terms.map((t) => parseInt(t, 10)).filter((n) => !isNaN(n)),
        repoUrl: p.repoUrl,
        href: `/projects/${p.id}`,
        source: p.source,
      };
    });

  const seenSlugs = new Set<string>();
  const allOrgs: DiscoverOrg[] = [];
  for (const org of [...lfxList, ...gsocList]) {
    if (!seenSlugs.has(org.slug)) {
      seenSlugs.add(org.slug);
      allOrgs.push(org);
    }
  }

  // Collect all unique technologies and topics across all organizations
  const techFreq = new Map<string, number>();
  for (const org of allOrgs) {
    for (const t of org.technologies) {
      techFreq.set(t, (techFreq.get(t) ?? 0) + 1);
    }
  }
  const allTechs = [...techFreq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  const topicFreq = new Map<string, number>();
  for (const org of allOrgs) {
    for (const t of org.topics) {
      if (!techFreq.has(t)) {
        topicFreq.set(t, (topicFreq.get(t) ?? 0) + 1);
      }
    }
  }
  const allTopics = [...topicFreq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  const facets = [...allTechs, ...allTopics];
  const savedArr = [...saved].filter((k) => k.startsWith("ORGANIZATION:"));

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Discover</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you interested in?
        </h1>
        <p className="sub">
          Pick your preferred languages and technologies. We suggest active open source organizations
          that match, showing their participation track and reasons.
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
