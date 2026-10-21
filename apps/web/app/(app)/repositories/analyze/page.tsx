import type { Metadata } from "next";
import { AnalyzeForm } from "@/features/repositories/AnalyzeForm";

export const metadata: Metadata = { title: "Analyze a repository" };

const CAN = [
  "Repository structure",
  "Technology",
  "Languages",
  "Activity",
  "Issues",
  "Pull requests",
  "Contributors",
  "Releases",
  "Contribution docs",
];

export default async function Analyze({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initial = (Array.isArray(sp.repo) ? sp.repo[0] : sp.repo)?.slice(0, 300) ?? "";
  return (
    <div className="narrow">
      <section className="page-hero">
        <div className="eyebrow">Repositories</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Understand any open source repository.
        </h1>
        <p className="sub">
          Paste a GitHub repository URL. OpenSourceX will show what the repository is, how active it
          is, and how to start contributing, with evidence and no single score.
        </p>
      </section>
      <div style={{ marginTop: 20 }}>
        <AnalyzeForm initial={initial} />
      </div>
      <section className="block" aria-labelledby="can-h">
        <h2 id="can-h" style={{ fontSize: 20 }}>
          What the analysis shows
        </h2>
        <div className="chips" style={{ marginTop: 14, gap: 10 }}>
          {CAN.map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Read live from GitHub&apos;s public API for public repositories, with links to the source
          of every figure. Nothing is scored; activity labels come with the numbers behind them. If
          the organization is in a mentorship program, its programs, community chat and past LFX
          Mentorship projects in the repository are shown too.
        </p>
      </section>
    </div>
  );
}
