import type { Metadata } from "next";
import { AnalyzeForm } from "@/features/repositories/AnalyzeForm";
import { Notice } from "@/components/feedback/Notice";

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

export default function Analyze() {
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
      <Notice kind="dev" testId="analyze-banner">
        Live repository analysis is not enabled in this development build. You can validate a URL,
        save the repository, and check the recorded sample.
      </Notice>
      <div style={{ marginTop: 20 }}>
        <AnalyzeForm />
      </div>
      <section className="block" aria-labelledby="can-h">
        <h2 id="can-h" style={{ fontSize: 20 }}>
          What OpenSourceX will understand
        </h2>
        <div className="chips" style={{ marginTop: 14, gap: 10 }}>
          {CAN.map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          None of this is available until live GitHub analysis is approved and connected.
        </p>
      </section>
    </div>
  );
}
