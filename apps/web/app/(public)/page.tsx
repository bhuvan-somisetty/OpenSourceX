import Link from "next/link";
import { listPrograms, listProjects } from "@opensourcex/database";
import { load } from "@/lib/data";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { Logo, PublicNav } from "@/features/landing/PublicNav";
import { StatusChip } from "@/components/status/StatusChip";
import { day } from "@/lib/format";

export const dynamic = "force-dynamic";

const CONCEPTS = [
  [
    "Discover",
    "Start from what you care about, a language, a technology or a domain, and see which programs and projects fit, with the reasons shown.",
  ],
  [
    "Understand",
    "Every project is an intelligence profile: what it is, its program history, technologies, mentors and where the facts came from.",
  ],
  [
    "Contribute",
    "Save the projects and repositories worth your time, come back to them, and start from the project's own repository and issues.",
  ],
  [
    "Prepare",
    "Practice explaining a project in your own words, so what you say about your contribution is something you understand.",
  ],
] as const;

const JOURNEY = [
  ["Discover", "Say what interests you."],
  ["Explore", "Pick a program, browse its projects."],
  ["Learn", "Read the project's history and sources."],
  ["Contribute", "Save it and start from its repository."],
  ["Explain", "Practice explaining your work."],
] as const;

export default async function Landing() {
  const [progs, projs] = await Promise.all([load(listPrograms), load((d) => listProjects(d))]);
  const live = new Set(
    progs.ok
      ? progs.data.filter((p) => p.organizations + p.mentorshipProjects > 0).map((p) => p.slug)
      : [],
  );
  const sample = projs.ok ? projs.data.items.find((p) => p.kind === "mentorship") : undefined;

  return (
    <>
      <PublicNav />

      <section className="hero" aria-labelledby="hero-h">
        <div className="beams" aria-hidden="true" />
        <div className="in">
          <div className="pill-note">
            <i aria-hidden="true" />
            Intelligence for open source
          </div>
          <h1 id="hero-h" className="display">
            Understand open source.
            <br />
            <span className="grad">Find where you belong.</span>
          </h1>
          <p className="lead">
            OpenSourceX connects programs, organizations, projects and repositories, and shows the
            source behind every fact, so you can contribute with confidence.
          </p>
          <div className="cta-row">
            <Link className="btn primary lg" href="/login" data-testid="cta-get-started">
              Get Started
            </Link>
            <a className="btn lg" href="#product" data-testid="cta-explore">
              Explore Open Source
            </a>
          </div>
        </div>
      </section>

      <section className="l-section" id="product" aria-labelledby="one-h">
        <div className="wrap">
          <div className="l-head">
            <div className="eyebrow">The product</div>
            <h2 id="one-h">One place to navigate open source.</h2>
          </div>
          <div className="concepts">
            {CONCEPTS.map(([t, d], i) => (
              <div className="concept" key={t}>
                <span className="n">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-section" id="programs" aria-labelledby="prog-h">
        <div className="wrap">
          <div className="l-head">
            <div className="eyebrow">Programs</div>
            <h2 id="prog-h">Choose a program. Explore its whole ecosystem.</h2>
            <p className="sub">
              Programs with recorded data in this build are available now. The others are configured
              but have no data yet.
            </p>
          </div>
          <div className="programs-row" data-testid="landing-programs">
            {PROGRAM_CATALOG.map((p) =>
              live.has(p.slug) ? (
                <Link key={p.slug} href="/login" className="program-word">
                  {p.short}
                  <small>recorded data available</small>
                </Link>
              ) : (
                <span key={p.slug} className="program-word soon" title="No data in this build yet">
                  {p.short}
                  <small>no data yet</small>
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="l-section" id="how" aria-labelledby="how-h">
        <div className="wrap">
          <div className="l-head">
            <div className="eyebrow">How it works</div>
            <h2 id="how-h">From finding a project to understanding your contribution.</h2>
          </div>
          <div className="journey">
            {JOURNEY.map(([t, d], i) => (
              <div className="step" key={t}>
                <span className="dot">0{i + 1}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-section" id="trust" aria-labelledby="trust-h">
        <div className="wrap">
          <div className="l-head">
            <div className="eyebrow">Evidence</div>
            <h2 id="trust-h">Every important fact should have a source.</h2>
            <p className="sub">
              Nothing is scored behind your back. Each fact carries where it came from, when, and
              how sure we are.
            </p>
          </div>
          <div className="chain" data-testid="trust-chain">
            <div className="link-node">
              <div className="k">Fact</div>
              <div className="v">
                {sample
                  ? `Listed in ${sample.program.name}: ${sample.terms[0] ?? "a recorded term"}`
                  : "A program lists a project for a term"}
              </div>
            </div>
            <div className="link-node">
              <div className="k">Source</div>
              <div className="v">
                {sample
                  ? `${sample.source.providerName}, Tier ${sample.source.tier}`
                  : "The program's own published data"}
              </div>
            </div>
            <div className="link-node">
              <div className="k">Evidence</div>
              <div className="v">
                {sample
                  ? `Recorded snapshot, ${day(sample.source.fetchedAt)}`
                  : "A saved, sanitized snapshot"}
              </div>
            </div>
            <div className="link-node">
              <div className="k">Status</div>
              <div className="v">
                <div className="chips">
                  <StatusChip status="RECORDED" />
                  <StatusChip status="CONFIRMED" />
                </div>
              </div>
            </div>
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            Shown from real recorded data in this development build. Not live.
          </p>
        </div>
      </section>

      <section className="l-section cta-band">
        <div className="wrap">
          <h2>Ready to explore open source?</h2>
          <div className="actions" style={{ justifyContent: "center", marginTop: 36 }}>
            <Link className="btn primary lg" href="/login">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <footer className="l-footer">
        <div className="wrap row">
          <div>
            <Logo />
            <p style={{ margin: "10px 0 0", maxWidth: "44ch" }}>
              Intelligence for open source. Development build on recorded data; nothing here is
              live.
            </p>
          </div>
          <div>
            <Link href="/login">Sign in</Link>
            <a href="#how">How it works</a>
            <a href="#trust">Evidence</a>
          </div>
        </div>
      </footer>
    </>
  );
}
