import Link from "next/link";
import { dataSnapshot, listPrograms, listProjects } from "@opensourcex/database";
import { PROVIDERS } from "@opensourcex/providers";
import { load } from "@/lib/data";
import { STATUS_META, day, liveLabel, type StatusKey } from "@/lib/format";
import { StatusChip } from "@/components/status/StatusChip";
import { DbDown, Notice } from "@/components/feedback/Notice";
import { ProjectCard } from "@/features/discovery/ProjectCard";

export const dynamic = "force-dynamic";

const JOURNEY = [
  ["Understand", "See how programs, organizations and projects connect.", "/programs"],
  ["Find", "Filter projects by technology and see why each matches.", "/discover"],
  ["Learn", "Read a project's sources, history and mentors.", "/projects"],
  [
    "Contribute",
    "Start from the project's own repository and issue links.",
    "/repositories/analyze",
  ],
  ["Explain", "Practice explaining what you understand, grounded in sources.", "/interview"],
] as const;

export default async function Home() {
  const [snap, progs, projs] = await Promise.all([
    load(dataSnapshot),
    load(listPrograms),
    load((d) => listProjects(d)),
  ]);
  const legend: StatusKey[] = [
    "CONFIRMED",
    "HISTORICAL",
    "RECORDED",
    "DEVELOPMENT",
    "INFERRED",
    "UNKNOWN",
    "STALE",
    "FORECAST",
  ];

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">The intelligence layer for open source</div>
          <h1>
            Understand Open Source. Find the Right Projects. <em>Contribute With Confidence.</em>
          </h1>
          <p className="lead">
            See how programs, organizations, projects and repositories connect, with the source of
            every fact one glance away.
          </p>
          <form action="/discover" className="search-hero" role="search">
            <label htmlFor="home-q" className="skip" style={{ position: "absolute" }}>
              Search projects
            </label>
            <input
              id="home-q"
              type="search"
              name="q"
              placeholder="Search projects, technologies, organizations"
            />
            <button className="btn primary" type="submit">
              Search
            </button>
          </form>
          <div className="actions">
            <Link className="btn primary" href="/discover">
              Start Exploring →
            </Link>
            <Link className="btn" href="/programs">
              Explore Programs
            </Link>
            <Link className="btn" href="/repositories/analyze">
              Analyze a Repository
            </Link>
            <Link className="btn" href="/interview">
              Practice Interview
            </Link>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="snap">
        <div className="wrap">
          <div className="chips">
            <StatusChip status="DEVELOPMENT" />
            <StatusChip status="RECORDED" />
          </div>
          <h2 id="snap" style={{ marginTop: 8 }}>
            Data snapshot
          </h2>
          <p className="sub">
            What this development build currently holds: a small set of recorded, sanitized samples,
            not complete coverage and not live.
          </p>
          {!snap.ok ? (
            <DbDown />
          ) : (
            <>
              <div className="grid g4" data-testid="snapshot-stats">
                {(
                  [
                    ["GSoC organizations", snap.data.counts.organizations],
                    ["Mentorship projects", snap.data.counts.mentorshipProjects],
                    ["Canonical terms", snap.data.counts.terms],
                    ["Mentors (public handles)", snap.data.counts.mentors],
                  ] as const
                ).map(([l, n]) => (
                  <div className="card" key={l}>
                    <div className="stat">{n}</div>
                    <div className="stat-label">{l}</div>
                  </div>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Recorded {snap.data.datasets.map((d) => day(d.fetchedAt)).sort()[0] ?? ""} ·
                datasets: {snap.data.datasets.map((d) => d.key).join(", ")}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="block" aria-labelledby="progs">
        <div className="wrap">
          <h2 id="progs">Explore programs</h2>
          <p className="sub">
            Each program states its granularity, so history is never overstated.
          </p>
          {!progs.ok ? (
            <DbDown />
          ) : (
            <div className="grid g2e">
              {progs.data.map((p) => (
                <Link key={p.slug} href={`/programs/${p.slug}`} className="card fade">
                  <h3 style={{ fontSize: 18 }}>{p.name}</h3>
                  <p className="muted" style={{ margin: "6px 0 10px" }}>
                    {p.granularity === "organization_year"
                      ? "Organization-level participation by year. Project-level and mentor history: not verified."
                      : "Project-level participation by term. CNCF ecosystem data shown; not all of LFX Mentorship."}
                  </p>
                  <div className="chips">
                    {p.years.length > 0 && <span className="tag">years: {p.years.join(", ")}</span>}
                    {p.organizations > 0 && (
                      <span className="tag">{p.organizations} organizations (sample)</span>
                    )}
                    {p.mentorshipProjects > 0 && (
                      <span className="tag">{p.mentorshipProjects} projects (sample)</span>
                    )}
                    {p.terms > 0 && <span className="tag">{p.terms} terms</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="block" aria-labelledby="disc">
        <div className="wrap">
          <h2 id="disc">Project discovery</h2>
          <p className="sub">
            A first look at recorded projects. Filter by technology on Discover.
          </p>
          {!projs.ok ? (
            <DbDown />
          ) : projs.data.items.length === 0 ? (
            <Notice kind="info">
              No recorded data yet. Run <code className="mono">pnpm db:seed</code>.
            </Notice>
          ) : (
            <div className="grid g3">
              {projs.data.items.slice(0, 3).map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          )}
          <div className="actions">
            <Link className="btn" href="/discover">
              See all recorded projects
            </Link>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="journey">
        <div className="wrap">
          <h2 id="journey">The open-source journey</h2>
          <p className="sub">
            From understanding an ecosystem to explaining your own contribution.
          </p>
          <ol className="grid g4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {JOURNEY.slice(0, 4).map(([t, d, href], i) => (
              <li key={t}>
                <Link className="card" href={href}>
                  <div className="step-n">0{i + 1}</div>
                  <h3>{t}</h3>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    {d}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
          <ol className="grid" style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
            <li>
              <Link className="card" href={JOURNEY[4][2]}>
                <div className="step-n">05</div>
                <h3>{JOURNEY[4][0]}</h3>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {JOURNEY[4][1]}
                </p>
              </Link>
            </li>
          </ol>
        </div>
      </section>

      <section className="block" aria-labelledby="how">
        <div className="wrap">
          <h2 id="how">How OpenSourceX works</h2>
          <p className="sub">Source → Evidence → Normalization → Provenance → OpenSourceX.</p>
          <div className="grid g4">
            {[
              [
                "Source",
                "Official programs, ecosystem repositories and GitHub, each with a documented permission status.",
              ],
              [
                "Evidence",
                "Facts are stored with the snapshot they came from; contact data is never kept.",
              ],
              [
                "Normalization",
                "Terms, links and names are normalized by dates and stable ids, not string guesses.",
              ],
              [
                "Provenance",
                "Every fact carries source, tier, date and status, so you can verify it.",
              ],
            ].map(([t, d]) => (
              <div className="card" key={t}>
                <h3>{t}</h3>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="trans">
        <div className="wrap">
          <h2 id="trans">Source transparency</h2>
          <p className="sub">The status system used everywhere in the app.</p>
          <div className="chips" data-testid="status-legend">
            {legend.map((k) => (
              <StatusChip key={k} status={k} />
            ))}
          </div>
          <ul className="crit" style={{ marginTop: 16 }}>
            {legend.slice(0, 4).map((k) => (
              <li key={k}>
                <StatusChip status={k} />
                <span className="muted">{STATUS_META[k].hint}</span>
              </li>
            ))}
          </ul>
          <div className="scroll" style={{ marginTop: 20 }}>
            <table className="stack">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Tier</th>
                  <th scope="col">Live access</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => (
                  <tr key={p.key}>
                    <th scope="row">{p.name}</th>
                    <td data-label="Tier">{p.tier}</td>
                    <td data-label="Live access">{liveLabel(p.ingestion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <Link className="btn" href="/sources">
              Read the source status in full
            </Link>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap" style={{ textAlign: "center" }}>
          <h2>Start with what the sources actually say</h2>
          <p className="sub">
            No scores, no guesses. Find a project, see its evidence, decide for yourself.
          </p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href="/discover">
              Start Exploring →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
