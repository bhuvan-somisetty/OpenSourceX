"use client";

import { useState, type DragEvent } from "react";
import type { RepoAnalysis } from "@/lib/repo-analysis";
import { PostcardActions } from "./Postcard";

export type EnvelopePhase = "idle" | "sending" | "done" | "error";

/** owner/repo from a github.com link or a bare "owner/repo", or null */
export function slugOf(value: string): string | null {
  const v = value.trim();
  const m = /github\.com\/([\w.-]+)\/([\w.-]+)/i.exec(v) ?? /^([\w.-]+)\/([\w.-]+)\/?$/.exec(v);
  return m ? `${m[1]}/${m[2]!.replace(/\.git$/, "")}` : null;
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

/**
 * The hero's mail metaphor: the link you paste is written on the envelope, the letter rises
 * out while the analysis runs, and it carries the repository's real details once it lands.
 */
export function Envelope({
  value,
  phase,
  analysis,
  onDropLink,
}: {
  value: string;
  phase: EnvelopePhase;
  analysis?: RepoAnalysis | null;
  onDropLink: (url: string) => void;
}) {
  const [over, setOver] = useState(false);
  const slug = slugOf(value);
  const a = phase === "done" ? analysis : null;
  const caption =
    phase === "sending"
      ? "Opening the repository…"
      : phase === "done" && a
        ? "Delivered. The full report is below."
        : phase === "error"
          ? "Returned to sender. Check the link and try again."
          : slug
            ? "Addressed. Press Analyze to open it."
            : "Paste a link, or drop one on the envelope.";

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    const link = text.split(/\s+/).find((t) => slugOf(t));
    if (link) onDropLink(link);
  };

  return (
    <div
      className={`env-stage env-${phase}${slug ? " env-addressed" : ""}${over ? " env-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      data-testid="analyze-envelope"
    >
      <div className="env" aria-hidden="true">
        <div className="env-back" />
        <div className="env-letter">
          <div className="env-letter-head">
            <span className="env-letter-mark">OSX</span>
            <span>Repository report</span>
          </div>
          {a ? (
            <div className="env-letter-body">
              <b className="env-letter-title">{a.repository}</b>
              {a.about.description && <p>{a.about.description}</p>}
              <div className="env-letter-facts">
                {a.about.mainLanguage && <span>{a.about.mainLanguage}</span>}
                <span>★ {fmt(a.about.stars)}</span>
                <span>⑂ {fmt(a.about.forks)}</span>
                {a.about.license && <span>{a.about.license}</span>}
              </div>
            </div>
          ) : (
            <div className="env-letter-lines">
              <i style={{ width: "72%" }} />
              <i style={{ width: "94%" }} />
              <i style={{ width: "86%" }} />
              <i style={{ width: "58%" }} />
              <i style={{ width: "78%" }} />
            </div>
          )}
        </div>
        <div className="env-pocket" />
        <div className="env-flap" />
        <div className="env-seal">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              transform="translate(4 4)"
            />
          </svg>
        </div>
        <div className="env-label">
          <span>To</span>
          <b>{slug ?? "owner/repo"}</b>
        </div>
        <div className="env-stamp">
          <span>OSX</span>
        </div>
        {a && <Postmark at={a.fetchedAt} />}
      </div>
      <p className="env-cap" aria-live="polite">
        {caption}
      </p>
      {a && <PostcardActions a={a} compact />}
    </div>
  );
}

/** The cancellation mark stamped when the analysis lands: the real date and time it was read. */
function Postmark({ at }: { at: string }) {
  const d = new Date(at);
  const day = d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="env-postmark" title={`Analyzed ${d.toLocaleString()}`}>
      <svg viewBox="0 0 150 92" width="150" height="92">
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <path strokeWidth="2.4" d="M2 30c8-6 14 6 22 0s14 6 22 0" />
          <path strokeWidth="2.4" d="M2 46c8-6 14 6 22 0s14 6 22 0" />
          <path strokeWidth="2.4" d="M2 62c8-6 14 6 22 0s14 6 22 0" />
          <circle cx="100" cy="46" r="42" strokeWidth="2.6" />
          <circle cx="100" cy="46" r="34" strokeWidth="1.2" />
        </g>
        <g fill="currentColor" textAnchor="middle" fontFamily="inherit">
          <text x="100" y="35" fontSize="8.5" fontWeight="700" letterSpacing="1.4">
            ANALYZED
          </text>
          <text x="100" y="51" fontSize="11" fontWeight="800">
            {day}
          </text>
          <text x="100" y="65" fontSize="10" fontWeight="600">
            {time}
          </text>
        </g>
      </svg>
    </div>
  );
}
