import Link from "next/link";
import { PublicNav } from "@/features/landing/PublicNav";

/** The public landing: one viewport, no sections below. Everything else lives in the product. */
export default function ProductLanding() {
  return (
    <div className="landing" data-testid="landing">
      <div className="atmos" aria-hidden="true" />
      <div className="pl-bg" aria-hidden="true">
        <div className="pl-spot" />
        <div className="pl-glow a" />
        <div className="pl-glow b" />
        <div className="pl-rings">
          <i className="pl-ring r1" />
          <i className="pl-ring r2" />
          <i className="pl-ring r3" />
        </div>
      </div>
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
