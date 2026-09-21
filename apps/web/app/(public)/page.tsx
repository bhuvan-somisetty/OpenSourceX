import Link from "next/link";
import { PublicNav } from "@/features/landing/PublicNav";
import { ExploreButton } from "@/features/landing/ExploreButton";

/** The public landing: one viewport, no sections below. Everything else lives in the product. */
export default function Landing() {
  return (
    <div className="landing" data-testid="landing">
      <div className="atmos" aria-hidden="true" />
      <PublicNav />

      <section className="l-hero" aria-labelledby="hero-h">
        <div className="eyebrow">Intelligence for open source</div>
        <h1 id="hero-h" className="hero-title">
          Understand open source.
          <br />
          <span className="soft">Find where you belong.</span>
        </h1>
        <p className="hero-lead">
          Discover programs, organizations, projects and repositories through verified evidence,
          then understand where and how to contribute.
        </p>
        <div className="hero-cta">
          <Link className="btn primary lg" href="/login" data-testid="cta-get-started">
            Get started
          </Link>
          <ExploreButton />
        </div>
      </section>

      <div className="signal" aria-hidden="true">
        <div className="wrap">
          <div className="signal-line">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="signal-labels">
            <span>Programs</span>
            <span>Projects</span>
            <span>Repositories</span>
            <span>Contributions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
