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
          <i className="ticks" />
          <i className="planet p1" />
          <i className="planet p2" />
          <i className="planet p3" />
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
          <span className="cta-label">Find Your Path</span>
          <svg
            className="cta-arrow"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            className="cta-rocket"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M12 2C15.5 5 16.5 9.5 15.5 15H8.5C7.5 9.5 8.5 5 12 2Z" fill="#1b2033" />
            <path d="M8.5 11L5 15.5V18l3.5-2zM15.5 11L19 15.5V18l-3.5-2z" fill="#1b2033" />
            <circle cx="12" cy="9" r="1.9" fill="#7d9bff" />
            <path d="M9.5 15h5l-.8 2.5h-3.4z" fill="#4a5578" />
          </svg>
          <i className="cta-flame" aria-hidden="true" />
        </Link>
      </div>
    </IntroStage>
  );
}
