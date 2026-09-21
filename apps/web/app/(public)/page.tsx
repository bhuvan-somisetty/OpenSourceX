import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

/** Brand entrance: mark, wordmark, tagline, one action. Fits one viewport; the product landing is at /product. */
export default function Intro() {
  return (
    <main className="intro" data-testid="intro">
      <div className="atmos" aria-hidden="true" />
      <div className="intro-inner">
        <div className="intro-mark intro-in" aria-hidden="true">
          <LogoMark size={96} />
        </div>
        <h1 className="intro-word intro-in d1">OpenSourceX</h1>
        <p className="intro-tag intro-in d2">Intelligence for open source.</p>
        <Link
          className="btn primary lg intro-cta intro-in d3"
          href="/product"
          data-testid="intro-cta"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
