"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { analyzeRepository, type AnalyzeResult } from "@/app/(app)/repositories/analyze/actions";
import { Notice } from "@/components/feedback/Notice";
import { StatusChip } from "@/components/status/StatusChip";
import { SaveButton } from "@/features/saved/SaveButton";

export function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [res, setRes] = useState<AnalyzeResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setRes(await analyzeRepository(url)));
        }}
        aria-label="Analyze a repository"
      >
        <div className="field">
          <label htmlFor="repo-url">GitHub repository URL</label>
          <input
            id="repo-url"
            type="url"
            name="url"
            required
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby="repo-hint"
            autoComplete="off"
          />
          <span id="repo-hint" className="hint">
            Only github.com repository URLs. The URL is validated and never fetched by this build.
          </span>
        </div>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Checking…" : "Check repository"}
          </button>
        </div>
      </form>

      <div aria-live="polite" style={{ marginTop: 16 }}>
        {res && res.state !== "repo" && (
          <Notice kind="err" testId="analyze-invalid">
            {res.message}
          </Notice>
        )}
        {res && res.state === "repo" && (
          <div className="card fade" data-testid="analyze-result">
            <div className="chips">
              <StatusChip status="CONFIRMED" label="URL is valid" />
              <StatusChip status="UNKNOWN" label="Repository not analyzed" />
            </div>
            <dl className="kv">
              <dt>Owner</dt>
              <dd className="mono">{res.owner}</dd>
              <dt>Repository</dt>
              <dd className="mono">{res.repo}</dd>
              <dt>Canonical URL</dt>
              <dd>
                <a href={res.canonical} target="_blank" rel="noreferrer noopener">
                  {res.canonical}
                </a>
              </dd>
              {res.note && (
                <>
                  <dt>Note</dt>
                  <dd>{res.note}</dd>
                </>
              )}
            </dl>
            {res.canonical && (
              <div className="actions" style={{ marginTop: 16 }} data-testid="analyze-save">
                <SaveButton
                  key={res.canonical}
                  entityType="REPOSITORY"
                  entityId={res.canonical}
                  initialSaved={!!res.saved}
                  label="repository"
                />
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Notice kind="dev" testId="analyze-disabled">
                Live repository analysis is not enabled in this development build.
              </Notice>
            </div>
            <h3 style={{ marginTop: 16 }}>In the recorded data</h3>
            {res.recorded.length === 0 ? (
              <p className="muted">This repository does not appear in the recorded sample.</p>
            ) : (
              <ul className="crit">
                {res.recorded.map((r) => (
                  <li key={r.id}>
                    <Link href={`/projects/${r.id}`}>{r.name}</Link>
                    <span className="muted">· {r.program.name} (recorded)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
