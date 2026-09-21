import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { IntroStage } from "@/features/intro/IntroStage";

/** Brand entrance: a stage for the mark. The mark itself lives in components/ui/Logo.tsx. */
export default function Intro() {
  return (
    <IntroStage>
      <div className="intro-bg" aria-hidden="true">
        <div className="intro-glow" />
        <div className="intro-glow b" />
        <div className="intro-horizon" />
        <div className="intro-spot" />
        <div className="intro-rings">
          <i className="ring r1" />
          <i className="ring r2" />
          <i className="ring r3" />
          <i className="ring r4" />
          <i className="orbit o1" />
          <i className="orbit o2" />
          <i className="orbit o3" />
          <i className="halo" />
        </div>
        <div className="intro-grid" />
        <div className="intro-grain" />
        <div className="intro-vignette" />
      </div>
      <div className="intro-inner">
        <div className="intro-mark" aria-hidden="true">
          <span className="intro-mark-in">
            <LogoMark size={96} />
          </span>
        </div>
        <h1 className="intro-word intro-in d1">OpenSourceX</h1>
        <p className="intro-tag intro-in d2">Intelligence for open source.</p>
        <Link className="intro-cta intro-in d3" href="/product" data-testid="intro-cta" data-cta>
          <span>Find Your Path</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </IntroStage>
  );
}
