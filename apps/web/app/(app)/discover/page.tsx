import Link from "next/link";
import type { Metadata } from "next";
import { listProjects, listLfxOrganizations } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved } from "@/lib/saved";
import { many, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { DiscoveryOrgCard, type DiscoverOrg, type Why } from "@/features/discovery/DiscoveryOrgCard";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase();

/** Discover: intent -> filter -> explanation -> exploration of active participating organizations */
export default async function Discover({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const interests = many(sp.i).slice(0, 8);
  const res = await load(async (d) => ({
    all: await listProjects(d),
    lfxOrgs: await listLfxOrganizations(d),
  }));
  const saved = await currentSaved();
  const cur: Params = { i: interests };

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Discover</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you interested in?
        </h1>
        <p className="sub">
          Pick your preferred languages and technologies. We suggest active open source organizations that match, showing their participation track and reasons.
        </p>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        (() => {
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

          // Compute most popular technologies across all organizations for interest chips
          const techFreq = new Map<string, number>();
          for (const org of allOrgs) {
            for (const t of org.technologies) {
              techFreq.set(t, (techFreq.get(t) ?? 0) + 1);
            }
          }
          const topTechs = [...techFreq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 16)
            .map(([name]) => name);

          const topicFreq = new Map<string, number>();
          for (const org of allOrgs) {
            for (const t of org.topics) {
              if (!techFreq.has(t)) {
                topicFreq.set(t, (topicFreq.get(t) ?? 0) + 1);
              }
            }
          }
          const topTopics = [...topicFreq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name]) => name);

          const facets = [...topTechs, ...topTopics];

          const matched = interests.length
            ? allOrgs
                .map((org) => ({
                  org,
                  hits: interests.filter((i) =>
                    [...org.technologies, ...org.topics].some((t) => norm(t) === norm(i)),
                  ),
                }))
                .filter((m) => m.hits.length > 0)
                .sort(
                  (a, b) =>
                    b.hits.length - a.hits.length ||
                    b.org.projectCount - a.org.projectCount ||
                    a.org.name.localeCompare(b.org.name),
                )
            : [];

          const displayList = interests.length
            ? matched
            : allOrgs.map((org) => ({ org, hits: [] }));

          const why = (org: DiscoverOrg, hits: string[]): Why[] => [
            ...(hits.length > 0
              ? hits.map((h) => ({
                  ok: true,
                  text: `Matches "${h}" in recorded organization technologies`,
                }))
              : [
                  {
                    ok: true,
                    text:
                      org.technologies.length > 0
                        ? `Primary stack: ${org.technologies.slice(0, 3).join(", ")}`
                        : "Active open source technology stack",
                  },
                ]),
            {
              ok: Boolean(org.latestTerm),
              text: org.latestTerm
                ? `${org.programName} track: Latest ${org.latestTerm} (${org.projectCount} recorded project${org.projectCount === 1 ? "" : "s"})`
                : `${org.programName} active organization`,
            },
            {
              ok: Boolean(org.repoUrl),
              text: org.repoUrl ? "Official repository available" : "Repository linked via program directory",
            },
            {
              ok: true,
              text: "Recurring organization (offers mentorship tracks across terms)",
            },
          ];

          return (
            <>
              <section aria-labelledby="int-h">
                <h2 id="int-h" style={{ fontSize: 18 }} className="muted">
                  Your interests
                </h2>
                <div className="chips" style={{ marginTop: 14, gap: 10 }} data-testid="interests">
                  {facets.map((f) => {
                    const on = interests.some((i) => norm(i) === norm(f));
                    const next = on
                      ? interests.filter((i) => norm(i) !== norm(f))
                      : [...interests, f];
                    return (
                      <Link
                        key={f}
                        className="interest"
                        href={withParams("/discover", cur, { i: next })}
                        aria-pressed={on}
                      >
                        {f}
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="block" aria-labelledby="res-h">
                {interests.length > 0 && matched.length === 0 ? (
                  <EmptyState
                    title="No recorded organization matches these interests"
                    action={
                      <Link className="btn" href="/discover">
                        Clear interests
                      </Link>
                    }
                  >
                    Try choosing broader programming languages or ecosystem topics from the list above.
                  </EmptyState>
                ) : (
                  <>
                    <h2 id="res-h" style={{ fontSize: 26 }}>
                      {interests.length > 0
                        ? "Organizations matching your interests"
                        : "Organizations across open source programs"}
                    </h2>
                    <p className="muted" style={{ margin: "6px 0 20px" }} data-testid="match-count">
                      {interests.length > 0
                        ? `${matched.length} organization${matched.length > 1 ? "s" : ""}. Ordered by coverage of your selected interests and participation depth.`
                        : `Showing all ${allOrgs.length} active participating organizations. Select one or more interests above to filter organizations by your preferred technologies.`}
                    </p>
                    <div className="grid g2e" data-testid="results">
                      {displayList.map(({ org, hits }) => (
                        <DiscoveryOrgCard
                          key={org.id}
                          org={org}
                          hits={hits}
                          why={why(org, hits)}
                          saved={saved.has(`ORGANIZATION:${org.id}`)}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 24 }}>
                  <Notice kind="dev">
                    <strong>Development data.</strong> Matches reflect verified organization records across open source programs.
                  </Notice>
                </div>
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}
