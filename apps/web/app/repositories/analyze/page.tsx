import type { Metadata } from "next";
import { AnalyzeForm } from "@/features/repositories/AnalyzeForm";
import { Notice } from "@/components/feedback/Notice";

export const metadata: Metadata = { title: "Analyze a repository" };

export default function Analyze() {
  return (
    <div className="wrap" style={{ paddingTop: 32, maxWidth: 820 }}>
      <div className="eyebrow">Repositories</div>
      <h1 className="page">Analyze a repository</h1>
      <p className="sub">
        Repository intelligence will show metadata, languages, contributors, commits, issues, pull
        request activity, releases and contribution docs as an evidence table, with no single score.
      </p>
      <Notice kind="dev" testId="analyze-banner">
        Live repository analysis is not enabled in this development build. You can validate a URL
        and check the recorded sample.
      </Notice>
      <div style={{ marginTop: 16 }}>
        <AnalyzeForm />
      </div>
    </div>
  );
}
