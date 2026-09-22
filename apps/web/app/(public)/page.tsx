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
          <span className="cta-archer" aria-hidden="true">
            <i className="cta-flash" />
            <svg width="60" height="60" viewBox="0 0 32 32" fill="none" className="archer-svg">
              <defs>
                <linearGradient
                  id="ctaBow"
                  x1="10"
                  y1="3"
                  x2="24"
                  y2="29"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#fff" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient
                  id="ctaArrow"
                  x1="4"
                  y1="16"
                  x2="31"
                  y2="16"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#8fa8ff" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#aebfff" />
                </linearGradient>
              </defs>
              <g transform="rotate(-45 16 16)">
                <path d="M11 3C27 9 27 23 11 29C20 23 20 9 11 3Z" fill="url(#ctaBow)" />
                <path
                  className="cta-string"
                  d="M11 3L7 16L11 29"
                  stroke="#fff"
                  strokeOpacity="0.55"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <g className="cta-arrow-grp">
                  <path
                    d="M7 16H26"
                    stroke="url(#ctaArrow)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path d="M23.5 11L31 16L23.5 21L25.6 16Z" fill="url(#ctaArrow)" />
                  <path d="M8 16L4 12.5L6.4 16L4 19.5Z" fill="url(#ctaArrow)" />
                </g>
              </g>
            </svg>
          </span>
        </Link>
      </div>
    </IntroStage>
  );
}
