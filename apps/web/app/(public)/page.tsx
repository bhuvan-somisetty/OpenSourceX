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
          <span className="cta-ship" aria-hidden="true">
            <i className="cta-smoke" />
            <i className="cta-flame" />
            <svg width="44" height="70" viewBox="0 0 40 64" fill="none">
              <defs>
                <linearGradient id="rk" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#9aa6c8" />
                  <stop offset="0.45" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#b7c1dd" />
                </linearGradient>
              </defs>
              <path d="M10 34L2 50v6l9-8z" fill="#6f8cff" />
              <path d="M30 34l8 16v6l-9-8z" fill="#6f8cff" />
              <path d="M20 2c10 10 13 26 10 44H10C7 28 10 12 20 2z" fill="url(#rk)" />
              <circle cx="20" cy="22" r="5" fill="#7d9bff" stroke="#1b2033" strokeWidth="2" />
              <path d="M13 46h14l-2.5 6h-9z" fill="#4a5578" />
            </svg>
          </span>
        </Link>
      </div>
      {/* runs before hydration, so the launch also plays on a slow first load */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var a=document.querySelector('[data-cta]');if(!a)return;a.addEventListener('click',function(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;var m=document.querySelector('.intro');if(!m||m.classList.contains('leaving'))return;e.preventDefault();var h=a.getAttribute('href');if(matchMedia('(prefers-reduced-motion: reduce)').matches){location.assign(h);return}a.style.width=a.getBoundingClientRect().width+'px';void a.offsetWidth;m.classList.add('leaving');a.classList.add('go');setTimeout(function(){location.assign(h)},1900)})})();`,
        }}
      />
    </IntroStage>
  );
}
