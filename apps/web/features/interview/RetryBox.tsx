"use client";

import { useRef, useState } from "react";
import {
  MODE_KEYS,
  type Delivery,
  type Feedback,
  type InterviewProject,
  type Level,
  type Mode,
} from "@/lib/interview/coach";
import type { Retry, SavedTurn } from "./history";
import { useDictation, useSpeechSupport } from "./voice";

const MIC = "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3";
const STOP = "M7 7h10v10H7z";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Answer one question again from the feedback page. The new answer is scored by the same
 * interviewer and kept beside the first one, so the two can be compared.
 */
export function RetryBox({
  turn,
  index,
  project,
  modes,
  level,
  onRetry,
}: {
  turn: SavedTurn;
  index: number;
  project: InterviewProject;
  modes: Mode[];
  level: Level;
  onRetry: (index: number, retry: Retry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0);
  const support = useSpeechSupport();
  const dict = useDictation("en-US");
  const text = `${dict.finalText}${dict.interim ? `${dict.finalText ? " " : ""}${dict.interim}` : ""}`;
  const first = turn.feedback.empty ? 0 : turn.feedback.overall;
  const r = turn.retry;

  const submit = async () => {
    const answer = text.trim();
    if (!answer || busy) return;
    dict.stop();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "turn",
          projectId: project.id,
          modes: modes.length ? modes : [turn.question.mode ?? MODE_KEYS[0]],
          level,
          history: [],
          question: turn.question,
          answer,
          seconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
          spoken: dict.heard,
          remaining: 0,
        }),
      });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as { feedback: Feedback; delivery?: Delivery };
      onRetry(index, {
        answer,
        at: new Date().toISOString(),
        feedback: j.feedback,
        delivery: j.delivery,
        seconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
      });
      dict.reset("");
      setOpen(false);
    } catch {
      setError("Couldn't score that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ivr-retry">
      {r && (
        <div className="ivr-retry-result">
          <div className="ivr-retry-head">
            <span className="ivr-k">Your second try</span>
            <span className="ivr-retry-score">
              {r.feedback.empty ? 0 : r.feedback.overall}
              {(() => {
                const d = (r.feedback.empty ? 0 : r.feedback.overall) - first;
                return d ? (
                  <em className={d > 0 ? "up" : "down"}>
                    {d > 0 ? "▲" : "▼"} {Math.abs(d)} vs first try
                  </em>
                ) : (
                  <em>same as first try</em>
                );
              })()}
            </span>
          </div>
          <p className="ivr-retry-answer">{r.answer}</p>
          <p className="ivr-reaction">{r.feedback.spoken}</p>
          {r.feedback.improve.length > 0 && (
            <ul className="iv-list up">
              {r.feedback.improve.slice(0, 2).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open ? (
        <div className="ivr-retry-box">
          <label className="ivr-k" htmlFor={`retry-${index}`}>
            Answer it again
          </label>
          <textarea
            id={`retry-${index}`}
            value={text}
            onChange={(e) => dict.setFinalText(e.target.value)}
            onPointerDown={() => {
              if (dict.listening) dict.stop();
            }}
            readOnly={dict.listening}
            placeholder="Say it out loud with the mic, or type it. Use what the model answer shows."
            maxLength={4000}
            rows={5}
          />
          <div className="ivr-retry-actions">
            {support.stt && (
              <button
                type="button"
                className={`btn sm ${dict.listening ? "is-on" : ""}`}
                onClick={() => {
                  if (dict.listening) return dict.stop();
                  started.current ||= Date.now();
                  dict.start();
                }}
              >
                <Icon d={dict.listening ? STOP : MIC} /> {dict.listening ? "Stop" : "Speak"}
              </button>
            )}
            <button
              type="button"
              className="btn primary sm"
              disabled={!text.trim() || busy}
              onClick={() => void submit()}
            >
              {busy ? "Scoring…" : "Score my new answer"}
            </button>
            <button
              type="button"
              className="btn sm iv-ghost"
              onClick={() => {
                dict.stop();
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p className="iv-err">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          className="iv-qaction ivr-retry-open"
          onClick={() => {
            started.current = Date.now();
            setOpen(true);
          }}
        >
          {r ? "Try it once more" : "Try this question again"}
        </button>
      )}
    </div>
  );
}
