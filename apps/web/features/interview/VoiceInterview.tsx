"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeDelivery,
  DIMENSIONS,
  LEVELS,
  MODE_KEYS,
  MODES,
  offlineQuestions,
  offlineReport,
  opening,
  scoreOffline,
  verdictFor,
  type Dimension,
  type Feedback,
  type InterviewProject,
  type Level,
  type Mode,
  type Question,
  type Report,
  type Turn,
} from "@/lib/interview/coach";
import { useDictation, useMicLevel, useSpeaker, useSpeechSupport } from "./voice";

export interface ProjectOption {
  id: string;
  name: string;
  org: string | null;
  program: string;
  technologies: string[];
  repoUrl: string | null;
}

type Phase = "setup" | "live" | "report";
type Step = "intro" | "asking" | "answer" | "scoring" | "reacting" | "finishing";
type Engine = "ai" | "offline";

interface Settings {
  mode: Mode;
  level: Level;
  count: number;
  voiceOut: boolean;
  voiceIn: boolean;
  handsFree: boolean;
  voice: string;
  rate: number;
}

interface PastSession {
  at: string;
  project: string;
  mode: Mode;
  overall: number;
}

const HISTORY_KEY = "osx.interview.history.v1";
const SETTINGS_KEY = "osx.interview.settings.v1";
const SILENCE_MS = 4500;

const MODE_ICON: Record<Mode, string> = {
  understanding: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v4l3 2",
  contribution:
    "M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v3a6 6 0 0 1-6 6H6",
  pr: "M18 15V9a3 3 0 0 0-3-3h-4m0 0 3-3m-3 3 3 3M6 9v12M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  technical: "m8 8-5 4 5 4m8-8 5 4-5 4M14 4l-4 16",
  architecture: "M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9zM7 10v2h10v-2M12 12v2",
};

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? ({ ...fallback, ...JSON.parse(v) } as T) : fallback;
  } catch {
    return fallback;
  }
}
function readList<T>(key: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: settings just aren't remembered */
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
const MIC = "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3";
const SPEAKER = "M11 5 6 9H3v6h3l5 4V5Zm5.5 3.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12";
const REPEAT = "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15m0 5v-5h5";
const SKIP = "m5 5 8 7-8 7V5Zm12 0v14";
const SEND = "m4 12 16-8-6 16-2.5-6.5L4 12Z";
const STOP = "M7 7h10v10H7z";

function ScoreRing({ value, size = 132, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="iv-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="iv-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="iv-ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
        />
      </svg>
      <div className="iv-ring-text">
        <strong style={{ fontSize: size / 3.4 }}>{value}</strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

function Orb({
  state,
  level,
}: {
  state: "idle" | "speaking" | "listening" | "thinking";
  level: number;
}) {
  return (
    <div className={`iv-orb is-${state}`} style={{ ["--lvl" as string]: level.toFixed(3) }}>
      <div className="iv-orb-core" />
      <div className="iv-orb-bars" aria-hidden="true">
        {[0.55, 0.85, 1, 0.85, 0.55].map((k, i) => (
          <span
            key={i}
            style={{
              height: `${12 + (state === "listening" ? level * 70 * k : state === "speaking" ? 18 * k : 4)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function VoiceInterview({
  projects,
  initial,
  initialMode,
  aiReady,
  signedIn,
}: {
  projects: ProjectOption[];
  initial: InterviewProject;
  initialMode: Mode;
  aiReady: boolean;
  signedIn: boolean;
}) {
  const support = useSpeechSupport();
  const speaker = useSpeaker();
  const dict = useDictation();

  const [phase, setPhase] = useState<Phase>("setup");
  const [project, setProject] = useState<InterviewProject>(initial);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState<Settings>({
    mode: initialMode,
    level: "intermediate",
    count: 5,
    voiceOut: true,
    voiceIn: true,
    handsFree: true,
    voice: "",
    rate: 1,
  });
  const [history, setHistory] = useState<PastSession[]>([]);
  const [micTest, setMicTest] = useState(false);

  // live session
  const [step, setStep] = useState<Step>("intro");
  const [plan, setPlan] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [engine, setEngine] = useState<Engine>("offline");
  const [note, setNote] = useState<string | null>(null);
  const [answerStart, setAnswerStart] = useState(0);
  const [now, setNow] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [typing, setTyping] = useState(false);
  const [pending, setPending] = useState<Question | null>(null);
  const session = useRef(0);

  useEffect(() => {
    setSettings((s) => read(SETTINGS_KEY, { ...s, mode: initialMode }));
    setHistory(readList<PastSession>(HISTORY_KEY));
  }, [initialMode]);
  useEffect(() => {
    if (phase === "setup") write(SETTINGS_KEY, { ...settings, mode: undefined });
  }, [settings, phase]);

  const canListen = support.stt && settings.voiceIn && !typing;
  const level = useMicLevel(micTest || (phase === "live" && dict.listening));

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const say = useCallback(
    async (text: string) => {
      if (!settings.voiceOut || !support.tts) return;
      await speaker.speak(text, { voice: settings.voice || undefined, rate: settings.rate });
    },
    [settings.voiceOut, settings.voice, settings.rate, support.tts, speaker],
  );

  const total = Math.min(settings.count, plan.length || settings.count);
  const answer = `${dict.finalText}${dict.interim ? `${dict.finalText ? " " : ""}${dict.interim}` : ""}`;

  // read at the moment the mic should open, not when the callback was created
  const listenNow = useRef(false);
  listenNow.current = canListen && settings.handsFree;
  const { start: startDictation, reset: resetDictation } = dict;

  const openAnswer = useCallback(
    (sid: number) => {
      if (session.current !== sid) return;
      setStep("answer");
      setAnswerStart(Date.now());
      if (listenNow.current) startDictation();
    },
    [startDictation],
  );

  const ask = useCallback(
    async (q: Question, sid: number, lead = "") => {
      setQuestion(q);
      setPending(null);
      resetDictation();
      setStep("asking");
      await say(`${lead}${lead ? " " : ""}${q.text}`);
      openAnswer(sid);
    },
    [resetDictation, say, openAnswer],
  );

  const start = useCallback(async () => {
    const sid = ++session.current;
    setMicTest(false);
    const qs = offlineQuestions(
      project,
      settings.mode,
      settings.count,
      Math.floor(Math.random() * 6),
    );
    setPlan(qs);
    setIdx(0);
    setTurns([]);
    setReport(null);
    setNote(null);
    setEngine("offline");
    setTyping(!support.stt || !settings.voiceIn);
    setPhase("live");
    setStep("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await say(opening(project, settings.mode, settings.level, Math.min(settings.count, qs.length)));
    if (session.current === sid) await ask(qs[0]!, sid);
  }, [project, settings, support.stt, say, ask]);

  const finish = useCallback(
    async (all: Turn[], sid: number) => {
      speaker.cancel();
      dict.stop();
      if (!all.length) {
        setPhase("setup");
        return;
      }
      setStep("finishing");
      let r: Report = offlineReport(project, all);
      let eng: Engine = "offline";
      try {
        const res = await fetch("/api/v1/interview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "report",
            projectId: project.id,
            mode: settings.mode,
            level: settings.level,
            turns: all.map(({ question, answer, seconds, feedback }) => ({
              question,
              answer,
              seconds,
              feedback,
            })),
          }),
        });
        if (res.ok) {
          const j = (await res.json()) as { report: Report; engine: Engine; note?: string };
          r = j.report;
          eng = j.engine;
          if (j.note) setNote(j.note);
        }
      } catch {
        /* offline report already built */
      }
      if (session.current !== sid) return;
      setEngine((e) => (e === "ai" || eng === "ai" ? "ai" : "offline"));
      setReport(r);
      setPhase("report");
      const past = [
        {
          at: new Date().toISOString(),
          project: project.name,
          mode: settings.mode,
          overall: r.overall,
        },
        ...readList<PastSession>(HISTORY_KEY),
      ].slice(0, 12);
      write(HISTORY_KEY, past);
      setHistory(past);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await say(
        `That's the end of the interview. You scored ${r.overall} out of 100: ${r.verdict}. ${r.summary}`,
      );
    },
    [project, settings.mode, settings.level, speaker, dict, say],
  );

  const submit = useCallback(async () => {
    if (!question || step !== "answer") return;
    const text = answer.trim();
    if (text.length < 3) return;
    const sid = session.current;
    dict.stop();
    speaker.cancel();
    const seconds = Math.max(1, Math.round((Date.now() - answerStart) / 1000));
    setStep("scoring");
    const remaining = total - (idx + 1);
    let feedback: Feedback;
    let next: Question | null = null;
    let delivery = analyzeDelivery(text, seconds);
    try {
      const res = await fetch("/api/v1/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "turn",
          projectId: project.id,
          mode: settings.mode,
          level: settings.level,
          history: turns.map((t) => ({ question: t.question.text, answer: t.answer })),
          question,
          answer: text,
          seconds,
          remaining,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as {
        feedback: Feedback;
        next: Question | null;
        delivery: typeof delivery;
        engine: Engine;
        note?: string;
      };
      feedback = j.feedback;
      next = j.next;
      delivery = j.delivery;
      if (j.engine === "ai") setEngine("ai");
      setNote(j.note ?? null);
    } catch {
      feedback = scoreOffline(project, question, text, delivery);
      setNote("Couldn't reach the server, so your browser scored this answer.");
    }
    if (session.current !== sid) return;
    const turn: Turn = { question, answer: text, seconds, feedback, delivery };
    const all = [...turns, turn];
    setTurns(all);
    setStep("reacting");
    if (remaining <= 0) {
      await say(feedback.spoken);
      if (session.current === sid) await finish(all, sid);
      return;
    }
    const upcoming =
      next ?? plan.find((p, i) => i > idx && !all.some((t) => t.question.id === p.id));
    setIdx(idx + 1);
    if (!upcoming) {
      await finish(all, sid);
      return;
    }
    if (settings.handsFree) {
      await ask(
        upcoming,
        sid,
        `${feedback.spoken} ${upcoming.followUp ? "Following up on that." : "Next question."}`,
      );
    } else {
      await say(feedback.spoken);
      if (session.current === sid) setPending(upcoming);
    }
  }, [
    question,
    step,
    answer,
    dict,
    speaker,
    answerStart,
    total,
    idx,
    project,
    settings,
    turns,
    plan,
    say,
    ask,
    finish,
  ]);

  const skip = useCallback(async () => {
    const sid = session.current;
    dict.stop();
    speaker.cancel();
    const remaining = total - (idx + 1);
    const upcoming = plan.find((p, i) => i > idx && !turns.some((t) => t.question.id === p.id));
    setIdx(idx + 1);
    if (remaining <= 0 || !upcoming) return finish(turns, sid);
    await ask(upcoming, sid, "No problem, let's move on.");
  }, [dict, speaker, total, idx, plan, turns, ask, finish]);

  const end = useCallback(() => {
    void finish(turns, session.current);
  }, [finish, turns]);

  const leave = useCallback(() => {
    session.current++;
    speaker.cancel();
    dict.stop();
    setPhase("setup");
  }, [speaker, dict]);

  // timer
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  // silence auto-submit (hands-free)
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (
      phase === "live" &&
      step === "answer" &&
      settings.handsFree &&
      dict.listening &&
      dict.finalText.trim().split(/\s+/).length >= 8 &&
      !dict.interim &&
      now - dict.lastHeard > SILENCE_MS
    )
      void submitRef.current();
  }, [
    now,
    phase,
    step,
    settings.handsFree,
    dict.listening,
    dict.finalText,
    dict.interim,
    dict.lastHeard,
  ]);

  // push to talk: hold Space outside text fields
  useEffect(() => {
    if (phase !== "live" || !canListen) return;
    const editable = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || editable(e.target) || step !== "answer") return;
      e.preventDefault();
      if (!dict.listening) dict.start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || editable(e.target)) return;
      e.preventDefault();
      if (dict.listening && !settings.handsFree) dict.stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, canListen, step, dict, settings.handsFree]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? projects.filter((p) =>
          `${p.name} ${p.org ?? ""} ${p.technologies.join(" ")}`.toLowerCase().includes(q),
        )
      : projects;
    return list.slice(0, 60);
  }, [projects, query]);

  const pick = (p: ProjectOption) => {
    setProject(p.id === initial.id ? initial : { ...p, summary: null, mentors: [] });
    try {
      // keep the URL in sync so a reload keeps the project
      window.history.replaceState(null, "", `/interview?project=${encodeURIComponent(p.id)}`);
    } catch {
      /* ignore */
    }
  };

  /* ------------------------------ setup ------------------------------ */
  if (phase === "setup") {
    const best = history.length ? Math.max(...history.map((h) => h.overall)) : null;
    return (
      <div className="iv" data-testid="interview-setup">
        <div className="iv-setup">
          <section className="iv-panel" aria-labelledby="iv-project-h">
            <div className="iv-step">1</div>
            <h2 id="iv-project-h" className="iv-h">
              Pick the project you'll talk about
            </h2>
            <div className="iv-picked" data-testid="picked-project">
              <div>
                <strong>{project.name}</strong>
                <span className="dim">
                  {[project.org, project.program].filter(Boolean).join(" · ")}
                </span>
              </div>
              {project.technologies.length > 0 && (
                <div className="chips">
                  {project.technologies.slice(0, 5).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="iv-search">Search projects</label>
              <input
                id="iv-search"
                type="search"
                placeholder="Name, organization or technology (e.g. Go, Kubernetes)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <ul className="iv-projects" role="listbox" aria-label="Projects">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === project.id}
                    onClick={() => pick(p)}
                  >
                    <span className="iv-p-name">{p.name}</span>
                    <span className="iv-p-meta">
                      {[p.org, p.technologies.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
              {!filtered.length && <li className="dim iv-empty">No project matches “{query}”.</li>}
            </ul>
          </section>

          <section className="iv-panel" aria-labelledby="iv-mode-h">
            <div className="iv-step">2</div>
            <h2 id="iv-mode-h" className="iv-h">
              Choose the interview
            </h2>
            <div
              className="iv-modes"
              role="radiogroup"
              aria-label="Interview mode"
              data-testid="modes"
            >
              {MODE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={settings.mode === k}
                  className="iv-mode"
                  onClick={() => update("mode", k)}
                >
                  <Icon d={MODE_ICON[k]} size={20} />
                  <strong>{MODES[k].label}</strong>
                  <span>{MODES[k].blurb}</span>
                </button>
              ))}
            </div>
            <div className="iv-row">
              <div>
                <div className="iv-label">Level</div>
                <div className="segmented" role="group" aria-label="Level">
                  {(Object.keys(LEVELS) as Level[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={settings.level === l}
                      onClick={() => update("level", l)}
                    >
                      {LEVELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="iv-label">Questions</div>
                <div className="segmented" role="group" aria-label="Number of questions">
                  {[3, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={settings.count === n}
                      onClick={() => update("count", n)}
                    >
                      {n} · ~{n * 2} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="iv-panel" aria-labelledby="iv-voice-h">
            <div className="iv-step">3</div>
            <h2 id="iv-voice-h" className="iv-h">
              Set up your voice
            </h2>
            <div className="iv-toggles">
              <label className="iv-toggle">
                <input
                  type="checkbox"
                  checked={settings.voiceOut && support.tts}
                  disabled={!support.tts}
                  onChange={(e) => update("voiceOut", e.target.checked)}
                />
                <span>
                  <strong>Interviewer speaks</strong>
                  <em>Questions and feedback are read aloud.</em>
                </span>
              </label>
              <label className="iv-toggle">
                <input
                  type="checkbox"
                  checked={settings.voiceIn && support.stt}
                  disabled={!support.stt}
                  onChange={(e) => update("voiceIn", e.target.checked)}
                />
                <span>
                  <strong>Answer out loud</strong>
                  <em>
                    {support.ready && !support.stt
                      ? "Not supported in this browser: use Chrome or Edge, or type."
                      : "Your speech becomes text live as you talk."}
                  </em>
                </span>
              </label>
              <label className="iv-toggle">
                <input
                  type="checkbox"
                  checked={settings.handsFree}
                  onChange={(e) => update("handsFree", e.target.checked)}
                />
                <span>
                  <strong>Hands-free conversation</strong>
                  <em>
                    The mic opens after each question and your answer is sent after a short pause.
                  </em>
                </span>
              </label>
            </div>
            {support.tts && settings.voiceOut && (
              <div className="iv-row">
                <div className="field" style={{ flex: "1 1 220px" }}>
                  <label htmlFor="iv-voice">Interviewer voice</label>
                  <select
                    id="iv-voice"
                    value={settings.voice}
                    onChange={(e) => update("voice", e.target.value)}
                  >
                    <option value="">Best available</option>
                    {speaker.voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: "1 1 160px" }}>
                  <label htmlFor="iv-rate">Speed · {settings.rate.toFixed(1)}×</label>
                  <input
                    id="iv-rate"
                    type="range"
                    min={0.8}
                    max={1.3}
                    step={0.1}
                    value={settings.rate}
                    onChange={(e) => update("rate", Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    void speaker.speak(
                      `Hi, I'm your interviewer for ${project.name}. Ready when you are.`,
                      {
                        voice: settings.voice || undefined,
                        rate: settings.rate,
                      },
                    )
                  }
                >
                  <Icon d={SPEAKER} size={16} /> Preview voice
                </button>
              </div>
            )}
            {support.stt && settings.voiceIn && (
              <div className="iv-mictest">
                <button type="button" className="btn sm" onClick={() => setMicTest((m) => !m)}>
                  <Icon d={micTest ? STOP : MIC} size={16} />{" "}
                  {micTest ? "Stop mic check" : "Check microphone"}
                </button>
                <div
                  className="iv-meter"
                  aria-label="Microphone level"
                  role="meter"
                  aria-valuenow={Math.round(level.level * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${Math.round(level.level * 100)}%` }} />
                </div>
                <span className="hint">
                  {level.denied
                    ? "Microphone blocked: allow it in the address bar."
                    : micTest
                      ? level.level > 0.08
                        ? "Sounds good."
                        : "Say something…"
                      : "Optional."}
                </span>
              </div>
            )}
          </section>
        </div>

        <div className="iv-launch">
          <div className="iv-launch-copy">
            <strong>
              {settings.count} {MODES[settings.mode].label.toLowerCase()} questions on{" "}
              {project.name}
            </strong>
            <span className="dim">
              {aiReady
                ? signedIn
                  ? "The AI interviewer adapts follow-ups to what you say and scores every answer."
                  : "Sign in for the AI interviewer. Without it, the offline coach scores your answers."
                : "The offline coach scores your answers on relevance, project knowledge, depth, structure and clarity."}
            </span>
          </div>
          <button
            type="button"
            className="btn primary lg iv-start"
            onClick={() => void start()}
            data-testid="start-interview"
          >
            <Icon d={MIC} /> Start interview
          </button>
        </div>
        {history.length > 0 && (
          <section className="iv-panel iv-progress" aria-labelledby="iv-hist-h">
            <h2 id="iv-hist-h" className="iv-h">
              Your progress
            </h2>
            <p className="dim" style={{ margin: "4px 0 14px" }}>
              Last {history.length} sessions in this browser. Best: {best}/100.
            </p>
            <div className="iv-spark" aria-hidden="true">
              {[...history].reverse().map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(6, h.overall)}%` }}
                  title={`${h.project} · ${MODES[h.mode]?.label} · ${h.overall}`}
                />
              ))}
            </div>
            <ul className="iv-hist">
              {history.slice(0, 4).map((h, i) => (
                <li key={i}>
                  <span>{h.project}</span>
                  <span className="dim">{MODES[h.mode]?.label}</span>
                  <strong>{h.overall}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  /* ------------------------------ report ------------------------------ */
  if (phase === "report" && report) {
    return (
      <ReportView
        report={report}
        turns={turns}
        project={project}
        mode={settings.mode}
        level={settings.level}
        engine={engine}
        note={note}
        onAgain={() => void start()}
        onSetup={leave}
        onHear={() =>
          void say(
            `${report.verdict}. ${report.summary} ${report.focus.map((f) => `${f.title}. ${f.actions[0]}`).join(" ")}`,
          )
        }
        speaking={speaker.speaking}
        onStopSpeaking={speaker.cancel}
      />
    );
  }

  /* ------------------------------- live ------------------------------- */
  const orbState =
    step === "scoring" || step === "finishing"
      ? "thinking"
      : speaker.speaking
        ? "speaking"
        : dict.listening
          ? "listening"
          : "idle";
  const status =
    step === "intro"
      ? "Interviewer is introducing the session"
      : step === "asking"
        ? "Interviewer is asking"
        : step === "scoring"
          ? "Listening back to your answer…"
          : step === "finishing"
            ? "Writing your report…"
            : step === "reacting"
              ? speaker.speaking
                ? "Interviewer is responding"
                : "Ready for the next question"
              : dict.listening
                ? settings.handsFree
                  ? "Listening · pause to send"
                  : "Listening"
                : "Your turn";
  const elapsed = step === "answer" && answerStart ? Math.max(0, (now - answerStart) / 1000) : 0;
  const waitingNext = step === "reacting" && !!pending;

  return (
    <div className="iv iv-live" data-testid="interview-session">
      <div className="iv-topbar">
        <div className="iv-topbar-title">
          <span className="iv-live-dot" aria-hidden="true" /> {project.name}
          <span className="dim"> · {MODES[settings.mode].label}</span>
        </div>
        <ol className="iv-dots" aria-label={`Question ${Math.min(idx + 1, total)} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <li
              key={i}
              className={i < idx ? "done" : i === idx ? "now" : ""}
              title={turns[i] ? `${turns[i]!.feedback.overall}/100` : undefined}
            />
          ))}
        </ol>
        <div className="iv-topbar-actions">
          <button type="button" className="btn sm" onClick={end} disabled={step === "finishing"}>
            End &amp; get report
          </button>
          <button
            type="button"
            className="btn sm iv-ghost"
            onClick={leave}
            aria-label="Leave interview"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="iv-stage-grid">
        <section className="iv-stage" aria-live="polite">
          <Orb state={orbState} level={orbState === "listening" ? level.level : 0} />
          <div className="iv-status" data-state={orbState}>
            {status}
          </div>
          <div className="iv-q-meta">
            Question {Math.min(idx + 1, total)} of {total}
            {question?.followUp && <span className="iv-chip">Follow-up</span>}
          </div>
          <p className="iv-question" data-testid="question">
            {question?.text ?? opening(project, settings.mode, settings.level, total)}
          </p>
          {support.tts && settings.voiceOut && question && (
            <button
              type="button"
              className="iv-link"
              onClick={() => (speaker.speaking ? speaker.cancel() : void say(question.text))}
            >
              <Icon d={speaker.speaking ? STOP : REPEAT} size={15} />{" "}
              {speaker.speaking ? "Stop voice" : "Repeat question"}
            </button>
          )}

          <div className={`iv-answer ${dict.listening ? "is-on" : ""}`}>
            <label htmlFor="answer" className="iv-label">
              Your answer {step === "answer" && <span className="iv-timer">{fmt(elapsed)}</span>}
            </label>
            <textarea
              id="answer"
              value={answer}
              placeholder={
                canListen
                  ? "Press the mic (or hold Space) and answer out loud. Your words appear here."
                  : "Type your answer as you would say it."
              }
              onChange={(e) => dict.setFinalText(e.target.value)}
              readOnly={dict.listening}
              disabled={step !== "answer"}
              maxLength={4000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            {dict.error && (
              <p className="iv-err" role="alert">
                {dict.error}
              </p>
            )}
          </div>

          <div className="iv-controls">
            {support.stt && settings.voiceIn && (
              <button
                type="button"
                className={`iv-mic ${dict.listening ? "is-on" : ""}`}
                onClick={() => {
                  setTyping(false);
                  if (dict.listening) dict.stop();
                  else dict.start();
                }}
                disabled={step !== "answer"}
                aria-pressed={dict.listening}
                aria-label={dict.listening ? "Stop microphone" : "Start microphone"}
              >
                <Icon d={dict.listening ? STOP : MIC} size={26} />
              </button>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() => void submit()}
              disabled={step !== "answer" || answer.trim().length < 3}
              data-testid="submit-answer"
            >
              <Icon d={SEND} size={16} /> Submit answer
            </button>
            <button
              type="button"
              className="btn iv-ghost"
              onClick={() => void skip()}
              disabled={step !== "answer"}
            >
              <Icon d={SKIP} size={16} /> Skip
            </button>
            {waitingNext && pending && (
              <button
                type="button"
                className="btn primary"
                onClick={() => void ask(pending, session.current)}
              >
                Next question →
              </button>
            )}
          </div>
          <p className="hint iv-keys">
            {canListen
              ? settings.handsFree
                ? "Hands-free: the mic opens by itself and sends after a 4-second pause. Ctrl+Enter sends now."
                : "Hold Space to talk, or tap the mic. Ctrl+Enter sends."
              : "Ctrl+Enter sends."}
          </p>
          {note && <p className="iv-note">{note}</p>}
        </section>

        <aside className="iv-notes" aria-label="Coach notes">
          <div className="iv-notes-head">
            <h2 className="iv-h">Coach notes</h2>
            <span className={`iv-engine ${engine}`}>
              {engine === "ai"
                ? "AI interviewer"
                : aiReady && signedIn
                  ? "AI · warming up"
                  : "Offline coach"}
            </span>
          </div>
          {!turns.length && (
            <div className="iv-notes-empty">
              <p>
                Feedback on each answer appears here: a score, what worked, and what to sharpen.
              </p>
              <ul>
                <li>Answer the question in your first sentence.</li>
                <li>
                  Name the project's stack
                  {project.technologies.length
                    ? ` (${project.technologies.slice(0, 3).join(", ")})`
                    : ""}
                  .
                </li>
                <li>Give one concrete example.</li>
              </ul>
            </div>
          )}
          {[...turns].reverse().map((t, n) => (
            <TurnCard key={turns.length - n} turn={t} index={turns.length - n} open={n === 0} />
          ))}
          {step === "scoring" && <div className="iv-skeleton" aria-label="Scoring your answer" />}
        </aside>
      </div>
    </div>
  );
}

function Bars({ scores }: { scores: Record<Dimension, number> }) {
  return (
    <ul className="iv-bars">
      {(Object.keys(DIMENSIONS) as Dimension[]).map((k) => (
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

function TurnCard({ turn, index, open }: { turn: Turn; index: number; open?: boolean }) {
  const f = turn.feedback;
  return (
    <details className="iv-turn" open={open} data-testid="feedback">
      <summary>
        <span
          className="iv-turn-score"
          data-band={f.overall >= 75 ? "hi" : f.overall >= 55 ? "mid" : "lo"}
        >
          {f.overall}
        </span>
        <span className="iv-turn-q">
          <span className="dim">Q{index}</span> {turn.question.text}
        </span>
      </summary>
      <div className="iv-turn-body">
        <p className="iv-said">“{f.spoken}”</p>
        {f.strengths.length > 0 && (
          <ul className="iv-list ok">
            {f.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
        {f.improve.length > 0 && (
          <ul className="iv-list up">
            {f.improve.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
        <Bars scores={f.scores} />
        <div className="iv-delivery">
          <span>{turn.delivery.words} words</span>
          <span>{fmt(turn.seconds)}</span>
          {turn.delivery.wpm && <span>{turn.delivery.wpm} wpm</span>}
          <span>{turn.delivery.fillerCount} fillers</span>
        </div>
        <details className="iv-stronger">
          <summary>A stronger answer would…</summary>
          <ul>
            {f.stronger.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
        <details className="iv-stronger">
          <summary>What you said</summary>
          <p className="iv-transcript">{turn.answer}</p>
        </details>
      </div>
    </details>
  );
}

function toMarkdown(r: Report, turns: Turn[], p: InterviewProject, mode: Mode, level: Level) {
  const lines = [
    `# Interview report: ${p.name}`,
    "",
    `${MODES[mode].label} · ${LEVELS[level]} · ${new Date().toLocaleString()}`,
    "",
    `**Score: ${r.overall}/100 (${r.verdict})**`,
    "",
    r.summary,
    "",
    "## Scores",
    ...(Object.keys(DIMENSIONS) as Dimension[]).map((k) => `- ${DIMENSIONS[k]}: ${r.scores[k]}/10`),
    "",
    "## Where to focus",
    ...r.focus.flatMap((f, i) => [
      `### ${i + 1}. ${f.title}`,
      f.why,
      ...f.actions.map((a) => `- ${a}`),
      "",
    ]),
    "## Questions",
    ...turns.flatMap((t, i) => [
      `### Q${i + 1}. ${t.question.text}`,
      `Score: ${t.feedback.overall}/100`,
      "",
      `> ${t.answer.replace(/\n/g, "\n> ")}`,
      "",
      ...t.feedback.improve.map((s) => `- Improve: ${s}`),
      ...t.feedback.stronger.map((s) => `- Stronger answer: ${s}`),
      "",
    ]),
    "From OpenSourceX interview practice.",
  ];
  return lines.join("\n");
}

function ReportView({
  report: r,
  turns,
  project,
  mode,
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
  mode: Mode;
  level: Level;
  engine: Engine;
  note: string | null;
  onAgain: () => void;
  onSetup: () => void;
  onHear: () => void;
  speaking: boolean;
  onStopSpeaking: () => void;
}) {
  const download = () => {
    const blob = new Blob([toMarkdown(r, turns, project, mode, level)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `interview-${project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const wpm = r.delivery.wpm;
  const pace = wpm == null ? "—" : wpm < 110 ? "a little slow" : wpm > 175 ? "fast" : "good pace";
  return (
    <div className="iv iv-report" data-testid="interview-report">
      <section className="iv-hero-card">
        <ScoreRing value={r.overall} size={168} label="/ 100" />
        <div className="iv-hero-copy">
          <div className="eyebrow">Interview report</div>
          <h2 className="iv-verdict">{r.verdict || verdictFor(r.overall)}</h2>
          <p className="iv-hero-meta">
            {project.name} · {MODES[mode].label} · {LEVELS[level]} · {turns.length} answered
          </p>
          <p className="iv-summary">{r.summary}</p>
          <div className="iv-hero-actions">
            <button type="button" className="btn primary" onClick={onAgain}>
              Practice again
            </button>
            <button type="button" className="btn" onClick={speaking ? onStopSpeaking : onHear}>
              <Icon d={speaking ? STOP : SPEAKER} size={16} /> {speaking ? "Stop" : "Hear feedback"}
            </button>
            <button type="button" className="btn" onClick={download}>
              Download report
            </button>
            <button type="button" className="btn iv-ghost" onClick={onSetup}>
              Change setup
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Scored by {engine === "ai" ? "the AI interviewer" : "the offline coach"}. {note}
          </p>
        </div>
      </section>

      <div className="iv-report-grid">
        <section className="iv-panel">
          <h2 className="iv-h">Scores</h2>
          <Bars scores={r.scores} />
        </section>
        <section className="iv-panel">
          <h2 className="iv-h">Delivery</h2>
          <dl className="iv-stats">
            <div>
              <dt>Talk time</dt>
              <dd>{fmt(r.delivery.talkSeconds)}</dd>
            </div>
            <div>
              <dt>Pace</dt>
              <dd>
                {wpm ?? "—"}
                <small> wpm · {pace}</small>
              </dd>
            </div>
            <div>
              <dt>Filler words</dt>
              <dd>
                {r.delivery.fillerCount}
                {r.delivery.topFillers.length > 0 && (
                  <small> · {r.delivery.topFillers.join(", ")}</small>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="iv-panel" aria-labelledby="iv-focus-h">
        <h2 id="iv-focus-h" className="iv-h">
          Where to focus next
        </h2>
        {r.focus.length ? (
          <ol className="iv-focus">
            {r.focus.map((f, i) => (
              <li key={i}>
                <div className="iv-focus-n">{i + 1}</div>
                <div>
                  <strong>{f.title}</strong>
                  <p className="dim">{f.why}</p>
                  <ul>
                    {f.actions.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="dim">
            Every area scored 8 or more. Try the Advanced level or another mode.
          </p>
        )}
        <div className="iv-links">
          <Link className="btn sm" href={`/projects/${project.id}`}>
            Review the project
          </Link>
          {project.repoUrl && (
            <Link
              className="btn sm"
              href={`/repositories/analyze?repo=${encodeURIComponent(project.repoUrl)}`}
            >
              Analyze its repository
            </Link>
          )}
          <Link className="btn sm" href="/ask">
            Ask a follow-up question
          </Link>
        </div>
      </section>

      <section className="iv-panel" aria-labelledby="iv-q-h">
        <h2 id="iv-q-h" className="iv-h">
          Answer by answer
        </h2>
        <div className="iv-turns">
          {turns.map((t, i) => (
            <TurnCard key={i} turn={t} index={i + 1} />
          ))}
        </div>
      </section>
    </div>
  );
}
