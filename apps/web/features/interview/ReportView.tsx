"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DIMENSIONS,
  LEVELS,
  MODE_KEYS,
  MODES,
  verdictFor,
  type Dimension,
  type InterviewProject,
  type Level,
  type Mode,
  type Report,
  type Scores,
  type Turn,
} from "@/lib/interview/coach";

type Engine = "ai" | "offline";
const DIMS = Object.keys(DIMENSIONS) as Dimension[];
const SHORT: Record<Dimension, string> = {
  relevance: "On point",
  knowledge: "Knowledge",
  depth: "Depth",
  structure: "Structure",
  clarity: "Clarity",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const band = (n: number) => (n >= 75 ? "hi" : n >= 50 ? "mid" : n > 0 ? "lo" : "none");
const modesTitle = (m: Mode[]) =>
  m.length === MODE_KEYS.length ? "Everything" : m.map((x) => MODES[x].label).join(", ");

/** Counts up from 0 once, for the big score. */
function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function BigScore({ value }: { value: number }) {
  const shown = useCountUp(value);
  const size = 196;
  const r = 84;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ivr-score b-${band(value)}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="ivr-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0607e" />
            <stop offset="100%" stopColor="#800020" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="ivr-score-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ivr-score-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <div className="ivr-score-text">
        <strong>{shown}</strong>
        <span>out of 100</span>
      </div>
    </div>
  );
}

/** Five-axis skill chart. */
function Radar({ scores }: { scores: Scores }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const R = 92;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / DIMS.length;
    return [cx + Math.cos(a) * R * (v / 10), cy + Math.sin(a) * R * (v / 10)] as const;
  };
  const poly = (v: (i: number) => number) => DIMS.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <svg
      className="ivr-radar"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={DIMS.map((d) => `${DIMENSIONS[d]} ${scores[d]} out of 10`).join(", ")}
    >
      {[2.5, 5, 7.5, 10].map((g) => (
        <polygon key={g} points={poly(() => g)} className="ivr-radar-grid" />
      ))}
      {DIMS.map((_, i) => {
        const [x, y] = pt(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="ivr-radar-axis" />;
      })}
      <polygon points={poly((i) => Math.max(0.2, scores[DIMS[i]!]))} className="ivr-radar-shape" />
      {DIMS.map((d, i) => {
        const [x, y] = pt(i, Math.max(0.2, scores[d]));
        return <circle key={d} cx={x} cy={y} r={3.5} className="ivr-radar-dot" />;
      })}
      {DIMS.map((d, i) => {
        const [x, y] = pt(i, 12.6);
        return (
          <text key={d} x={x} y={y} className="ivr-radar-label" textAnchor="middle">
            <tspan x={x} dy="0">
              {SHORT[d]}
            </tspan>
            <tspan x={x} dy="14" className="ivr-radar-val">
              {scores[d]}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

function Bars({ scores }: { scores: Scores }) {
  return (
    <ul className="iv-bars">
      {DIMS.map((k) => (
        <li key={k}>
          <span>{DIMENSIONS[k]}</span>
          <div className="iv-bar">
            <span style={{ width: `${scores[k] * 10}%` }} data-low={scores[k] < 6 || undefined} />
          </div>
          <strong>{scores[k]}</strong>
        </li>
      ))}
    </ul>
  );
}

function AnswerCard({ turn, index }: { turn: Turn; index: number }) {
  const f = turn.feedback;
  return (
    <details className={`ivr-answer b-${band(f.overall)}`}>
      <summary>
        <span className="ivr-answer-score">{f.empty ? "—" : f.overall}</span>
        <span className="ivr-answer-q">
          <span className="ivr-answer-n">
            Question {index}
            {turn.question.mode ? ` · ${MODES[turn.question.mode].label}` : ""}
          </span>
          {turn.question.text}
        </span>
        <span className="ivr-chev" aria-hidden="true" />
      </summary>
      <div className="ivr-answer-body">
        <div className="ivr-said">
          <span className="ivr-k">You {turn.delivery.spoken ? "said" : "wrote"}</span>
          <p>{turn.answer}</p>
        </div>
        <p className="ivr-reaction">{f.spoken}</p>
        <div className="ivr-two">
          {f.strengths.length > 0 && (
            <div>
              <span className="ivr-k ok">What worked</span>
              <ul className="iv-list ok">
                {f.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {f.improve.length > 0 && (
            <div>
              <span className="ivr-k up">Sharpen</span>
              <ul className="iv-list up">
                {f.improve.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="ivr-stronger">
          <span className="ivr-k">A stronger answer would</span>
          <ol>
            {f.stronger.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        {!f.empty && <Bars scores={f.scores} />}
        <div className="iv-delivery">
          <span>{turn.delivery.words} words</span>
          {turn.delivery.spoken ? (
            <>
              <span>{fmt(turn.seconds)} spoken</span>
              {turn.delivery.wpm && <span>{turn.delivery.wpm} words a minute</span>}
              <span>{turn.delivery.fillerCount} filler words</span>
            </>
          ) : (
            <span>typed</span>
          )}
        </div>
      </div>
    </details>
  );
}

function toMarkdown(r: Report, turns: Turn[], p: InterviewProject, modes: Mode[], level: Level) {
  return [
    `# Interview report: ${p.name}`,
    "",
    `${modesTitle(modes)} · ${LEVELS[level]} · ${new Date().toLocaleString()}`,
    "",
    `**Score: ${r.overall}/100 (${r.verdict})**`,
    "",
    r.summary,
    "",
    "## Scores",
    ...DIMS.map((k) => `- ${DIMENSIONS[k]}: ${r.scores[k]}/10`),
    "",
    "## Where to focus",
    ...r.focus.flatMap((f, i) => [
      `### ${i + 1}. ${f.title}`,
      f.why,
      ...f.actions.map((a) => `- [ ] ${a}`),
      "",
    ]),
    "## Questions",
    ...turns.flatMap((t, i) => [
      `### Q${i + 1}. ${t.question.text}`,
      `Score: ${t.feedback.empty ? "no answer" : `${t.feedback.overall}/100`}`,
      "",
      `> ${t.answer.replace(/\n/g, "\n> ")}`,
      "",
      ...t.feedback.improve.map((s) => `- Improve: ${s}`),
      ...t.feedback.stronger.map((s) => `- Stronger answer: ${s}`),
      "",
    ]),
    "From OpenSourceX interview practice.",
  ].join("\n");
}

const SPEAKER = "M11 5 6 9H3v6h3l5 4V5Zm5.5 3.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12";
const STOP = "M7 7h10v10H7z";
const DOWNLOAD = "M12 4v11m0 0-4-4m4 4 4-4M5 20h14";
const AGAIN = "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15m0 5v-5h5";

function I({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function ReportView({
  report: r,
  turns,
  project,
  modes,
  level,
  engine,
  note,
  onAgain,
  onSetup,
  onHear,
  speaking,
  onStopSpeaking,
}: {
  report: Report;
  turns: Turn[];
  project: InterviewProject;
  modes: Mode[];
  level: Level;
  engine: Engine;
  note: string | null;
  onAgain: () => void;
  onSetup: () => void;
  onHear: () => void;
  speaking: boolean;
  onStopSpeaking: () => void;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const answered = turns.filter((t) => !t.feedback.empty);
  const empty = r.emptyAnswers ?? turns.length - answered.length;
  const ranked = [...answered].sort((a, b) => b.feedback.overall - a.feedback.overall);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const indexOf = (t: Turn) => turns.indexOf(t) + 1;
  const wpm = r.delivery.wpm;
  const spokenAnswers = r.delivery.spokenAnswers ?? 0;
  const pacePos = wpm == null ? 0 : Math.max(0, Math.min(100, ((wpm - 60) / 160) * 100));
  const verdict = r.verdict || verdictFor(r.overall);
  const totalActions = r.focus.reduce((n, f) => n + f.actions.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;

  const download = () => {
    const blob = new Blob([toMarkdown(r, turns, project, modes, level)], {
      type: "text/markdown",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `interview-${project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="iv ivr" data-testid="interview-report">
      <section className={`ivr-hero b-${band(r.overall)}`}>
        <BigScore value={r.overall} />
        <div className="ivr-hero-copy">
          <div className="ivr-eyebrow">
            <span className="ivr-dot" aria-hidden="true" /> Interview report
          </div>
          <h2 className="ivr-verdict">{verdict}</h2>
          <p className="ivr-meta">
            <span>{project.name}</span>
            <span>{modesTitle(modes)}</span>
            <span>{LEVELS[level]}</span>
          </p>
          <p className="ivr-summary">{r.summary}</p>
          <div className="ivr-actions">
            <button type="button" className="btn primary" onClick={onAgain}>
              <I d={AGAIN} /> Practice again
            </button>
            <button type="button" className="btn" onClick={speaking ? onStopSpeaking : onHear}>
              <I d={speaking ? STOP : SPEAKER} /> {speaking ? "Stop" : "Hear feedback"}
            </button>
            <button type="button" className="btn" onClick={download}>
              <I d={DOWNLOAD} /> Download
            </button>
            <button type="button" className="btn iv-ghost" onClick={onSetup}>
              New interview
            </button>
          </div>
          <p className="ivr-engine">
            <span className={`iv-engine ${engine}`}>
              {engine === "ai" ? "Scored by the AI interviewer" : "Scored by the offline coach"}
            </span>
            {note && <span className="hint">{note}</span>}
          </p>
        </div>
      </section>

      <div className="ivr-stats">
        <div>
          <span>Answered</span>
          <strong>
            {answered.length}
            <small>/{turns.length}</small>
          </strong>
          <em>{empty ? `${empty} left empty` : "every question"}</em>
        </div>
        <div>
          <span>Best answer</span>
          <strong>{best ? best.feedback.overall : "—"}</strong>
          <em>{best ? `Question ${indexOf(best)}` : "none yet"}</em>
        </div>
        <div>
          <span>{spokenAnswers ? "Speaking time" : "Answer mode"}</span>
          <strong>{spokenAnswers ? fmt(r.delivery.talkSeconds) : "Typed"}</strong>
          <em>
            {spokenAnswers
              ? `${spokenAnswers} spoken answer${spokenAnswers === 1 ? "" : "s"}`
              : "try answering out loud"}
          </em>
        </div>
        <div>
          <span>Filler words</span>
          <strong>{spokenAnswers ? r.delivery.fillerCount : "—"}</strong>
          <em>
            {spokenAnswers
              ? r.delivery.topFillers.join(", ") || "clean delivery"
              : "only for spoken answers"}
          </em>
        </div>
      </div>

      {empty > 0 && (
        <div className="ivr-empty">
          <strong>
            {empty === turns.length
              ? "No question was really answered."
              : `${empty} answer${empty === 1 ? " was" : "s were"} empty and scored 0.`}
          </strong>
          <span>
            &ldquo;I don&apos;t know&rdquo; ends the conversation. Say what you do know, then how
            you would find the rest: the docs, the code, or asking the mentors. Interviewers reward
            that.
          </span>
        </div>
      )}

      <div className="ivr-grid">
        <section className="iv-panel ivr-skills">
          <h2 className="iv-h">Skill profile</h2>
          <div className="ivr-skills-body">
            <Radar scores={r.scores} />
            <Bars scores={r.scores} />
          </div>
        </section>

        <section className="iv-panel ivr-delivery">
          <h2 className="iv-h">Delivery</h2>
          {spokenAnswers ? (
            <>
              <div className="ivr-pace">
                <div className="ivr-pace-head">
                  <strong>{wpm ?? "—"}</strong>
                  <span>words a minute</span>
                </div>
                <div className="ivr-pace-track" aria-hidden="true">
                  <span className="ivr-pace-zone" />
                  {wpm != null && <span className="ivr-pace-pin" style={{ left: `${pacePos}%` }} />}
                </div>
                <div className="ivr-pace-scale" aria-hidden="true">
                  <span>Slow</span>
                  <span>Ideal 120 to 160</span>
                  <span>Fast</span>
                </div>
              </div>
              <p className="dim ivr-small">
                {wpm == null
                  ? "Speak a little longer to measure your pace."
                  : wpm < 110
                    ? "A little slow: shorter pauses and fewer restarts will help."
                    : wpm > 175
                      ? "Quite fast: slow down so the interviewer can follow."
                      : "Good pace: easy to follow."}
              </p>
            </>
          ) : (
            <div className="ivr-typed">
              <strong>You typed your answers</strong>
              <p>
                Pace and filler words are measured only when you speak. Real interviews are spoken,
                so try the next one out loud.
              </p>
            </div>
          )}
          {best && worst && (
            <div className="ivr-hl">
              <div className="ivr-hl-card good">
                <span>Strongest · Q{indexOf(best)}</span>
                <strong>{best.feedback.overall}</strong>
                <p>{best.question.text}</p>
              </div>
              <div className="ivr-hl-card weak">
                <span>Needs work · Q{indexOf(worst)}</span>
                <strong>{worst.feedback.overall}</strong>
                <p>{worst.question.text}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="iv-panel ivr-focus" aria-labelledby="ivr-focus-h">
        <div className="ivr-focus-head">
          <h2 id="ivr-focus-h" className="iv-h">
            Your practice plan
          </h2>
          {totalActions > 0 && (
            <span className="ivr-progress">
              <span style={{ width: `${(doneCount / totalActions) * 100}%` }} />
              <em>
                {doneCount}/{totalActions} done
              </em>
            </span>
          )}
        </div>
        {r.focus.length ? (
          <ol className="ivr-plan">
            {r.focus.map((f, i) => (
              <li key={i}>
                <div className="ivr-plan-n">{i + 1}</div>
                <div className="ivr-plan-body">
                  <strong>{f.title}</strong>
                  <p className="dim">{f.why}</p>
                  <ul>
                    {f.actions.map((a, j) => {
                      const id = `${i}-${j}`;
                      return (
                        <li key={j}>
                          <label className={done[id] ? "is-done" : ""}>
                            <input
                              type="checkbox"
                              checked={!!done[id]}
                              onChange={(e) => setDone({ ...done, [id]: e.target.checked })}
                            />
                            <span>{a}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="dim">
            Every area scored 8 or more. Try the Advanced level or another type.
          </p>
        )}
        <div className="ivr-links">
          {!project.id.startsWith("repo:") && (
            <Link className="btn sm" href={`/projects/${project.id}`}>
              Review the project
            </Link>
          )}
          {project.repoUrl && (
            <Link
              className="btn sm"
              href={`/repositories/analyze?repo=${encodeURIComponent(project.repoUrl)}`}
            >
              Analyze the repository
            </Link>
          )}
          <Link className="btn sm" href="/ask">
            Ask a follow-up question
          </Link>
        </div>
      </section>

      <section className="iv-panel" aria-labelledby="ivr-q-h">
        <h2 id="ivr-q-h" className="iv-h">
          Answer by answer
        </h2>
        <div className="ivr-answers">
          {turns.map((t, i) => (
            <AnswerCard key={i} turn={t} index={i + 1} />
          ))}
        </div>
      </section>
    </div>
  );
}
