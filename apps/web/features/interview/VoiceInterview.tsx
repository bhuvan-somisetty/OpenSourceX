"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  analyzeDelivery,
  DIMENSIONS,
  LEVELS,
  maxQuestions,
  MODE_KEYS,
  MODES,
  modesLabel,
  offlineQuestions,
  offlineReport,
  opening,
  scoreOffline,
  spokenName,
  type Dimension,
  type Feedback,
  type InterviewProject,
  type Level,
  type Mode,
  type Question,
  type Report,
  type Turn,
} from "@/lib/interview/coach";
import { ReportView } from "./ReportView";
import { RepoLookup } from "./RepoLookup";
import { VoicePicker } from "./VoicePicker";
import {
  prefersIndian,
  useDictation,
  useMicLevel,
  useMicPermission,
  useSpeaker,
  useSpeechSupport,
  type VoiceOption,
} from "./voice";

export interface ProjectOption {
  id: string;
  name: string;
  org: string | null;
  program: string;
  technologies: string[];
  repoUrl: string | null;
  /** when it ran, newest first; one entry per term for an idea offered several times */
  when: string[];
  /** ids of the same idea in other terms */
  alsoIds?: string[];
}

type Phase = "setup" | "live" | "report";
type Step = "intro" | "asking" | "answer" | "scoring" | "reacting" | "finishing";
type Engine = "ai" | "offline";

type Accent = "en-IN" | "en-US" | "en-GB";
const COUNTS = [
  { n: 3, label: "Quick", min: 6 },
  { n: 5, label: "Standard", min: 10 },
  { n: 8, label: "Deep dive", min: 16 },
  { n: 10, label: "Full mock", min: 20 },
];

interface Settings {
  modes: Mode[];
  accent: Accent;
  level: Level;
  count: number;
  voiceOut: boolean;
  voiceIn: boolean;
  handsFree: boolean;
  voice: string;
  rate: number;
  /** interviewer loudness, 0 to 1 */
  volume: number;
}

interface PastSession {
  at: string;
  project: string;
  /** older sessions stored a single mode */
  mode?: Mode;
  modes?: Mode[];
  overall: number;
}

const pastLabel = (h: PastSession) => {
  const m = h.modes ?? (h.mode ? [h.mode] : []);
  return m.length === MODE_KEYS.length
    ? "Everything"
    : m
        .map((x) => MODES[x]?.label)
        .filter(Boolean)
        .join(", ");
};
const modesTitle = (m: Mode[]) =>
  m.length === MODE_KEYS.length ? "Everything" : m.map((x) => MODES[x].label).join(", ");
/** What a voice says when previewed: its name, then the interview it is about to run. */
const sample = (name: string, p: InterviewProject | null) =>
  `Hi, I'm ${name}, your interviewer. ${
    p ? `Let's talk about ${spokenName(p)}.` : "Let's get you ready for your mentorship interview."
  }`;

const HISTORY_KEY = "osx.interview.history.v1";
const SETTINGS_KEY = "osx.interview.settings.v1";
const SILENCE_MS = 4500;

const ALL_ICON = "M4 6h16M4 12h16M4 18h10";
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

/**
 * Runs a layout change as a smooth morph (the subject box narrowing into two columns) where the
 * browser supports view transitions; otherwise it just happens.
 */
function morph(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return update();
  // only the setup cards animate; the rest of the page holds still
  const root = document.documentElement;
  root.classList.add("iv-morphing");
  const t = doc.startViewTransition(() => flushSync(update)) as { finished?: Promise<void> };
  void (t?.finished ?? Promise.resolve()).finally(() => root.classList.remove("iv-morphing"));
}

/** Brings the live interview or the report into view once it has rendered. */
function scrollTo(selector: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    ),
  );
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
const REPEAT = "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15m0 5v-5h5";
const SKIP = "m5 5 8 7-8 7V5Zm12 0v14";
const SEND = "m4 12 16-8-6 16-2.5-6.5L4 12Z";
const STOP = "M7 7h10v10H7z";

function Orb({
  state,
  level,
}: {
  state: "idle" | "speaking" | "listening" | "thinking";
  level: number;
}) {
  return (
    <div className={`iv-orb is-${state}`} style={{ ["--lvl" as string]: level.toFixed(3) }}>
      <span className="iv-orb-ripple" aria-hidden="true" />
      <span className="iv-orb-ripple r2" aria-hidden="true" />
      <span className="iv-orb-ripple r3" aria-hidden="true" />
      <span className="iv-orb-halo" aria-hidden="true" />
      <div className="iv-orb-core">
        <span className="iv-orb-swirl" aria-hidden="true" />
      </div>
      <div className="iv-orb-bars" aria-hidden="true">
        {[0.55, 0.85, 1, 0.85, 0.55].map((k, i) => (
          <span
            key={i}
            style={{
              height: `${12 + (state === "listening" ? level * 70 * k : state === "speaking" ? 30 * k : 4)}%`,
              animationDelay: `${i * 0.12}s`,
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
  /** the subject named in the URL; null until the user picks one */
  initial: InterviewProject | null;
  /** an interview type named in the URL; nothing is preselected otherwise */
  initialMode: Mode | null;
  aiReady: boolean;
  signedIn: boolean;
}) {
  const support = useSpeechSupport();
  const speaker = useSpeaker();

  const [phase, setPhase] = useState<Phase>("setup");
  const [project, setProject] = useState<InterviewProject | null>(initial);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState<Settings>({
    modes: initialMode ? [initialMode] : [],
    accent: "en-US",
    level: "intermediate",
    count: 0,
    voiceOut: true,
    voiceIn: true,
    handsFree: true,
    voice: "",
    rate: 1,
    volume: 1,
  });
  // the interviewer introduces themself by the chosen voice's name when a voice reads aloud
  const interviewerName = settings.voiceOut
    ? (speaker.voices.find((v) => v.id === settings.voice) ?? speaker.voices[0])?.persona
    : undefined;
  const [history, setHistory] = useState<PastSession[]>([]);
  const [micTest, setMicTest] = useState(false);
  const [source, setSource] = useState<"list" | "repo">(
    initial && !initial.id.startsWith("repo:") ? "list" : "repo",
  );
  const [previewing, setPreviewing] = useState<string | null>(null);
  const dict = useDictation(settings.accent);

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
    const india = prefersIndian();
    // only voice preferences are remembered; the interview itself is chosen fresh each time
    setSettings((s) => {
      const saved = read(SETTINGS_KEY, {
        voiceOut: s.voiceOut,
        voiceIn: s.voiceIn,
        handsFree: s.handsFree,
        voice: s.voice,
        rate: s.rate,
        volume: s.volume,
      });
      return { ...s, ...saved, accent: india ? "en-IN" : "en-US" };
    });
    setHistory(readList<PastSession>(HISTORY_KEY));
  }, [initialMode]);
  useEffect(() => {
    if (phase === "setup") {
      const { voiceOut, voiceIn, handsFree, voice, rate, volume } = settings;
      write(SETTINGS_KEY, { voiceOut, voiceIn, handsFree, voice, rate, volume });
    }
  }, [settings, phase]);

  const mic = useMicPermission();
  const [micBlocked, setMicBlocked] = useState(false);
  const canListen = support.stt && settings.voiceIn && !typing;
  const level = useMicLevel(micTest || (phase === "live" && dict.listening));

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const say = useCallback(
    async (text: string) => {
      if (!settings.voiceOut || !support.tts) return;
      await speaker.speak(text, {
        voice: settings.voice || undefined,
        rate: settings.rate,
        volume: settings.volume,
      });
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
    if (!project || !settings.modes.length || !settings.count) return;
    const sid = ++session.current;
    setMicTest(false);
    // ask for the microphone now, inside the click, so the browser shows its Allow prompt
    let typed = !support.stt || !settings.voiceIn;
    setMicBlocked(false);
    if (!typed && (await mic.request()) !== "granted") {
      typed = true;
      setMicBlocked(true);
    }
    const qs = offlineQuestions(
      project,
      settings.modes,
      settings.count,
      Math.floor(Math.random() * 6),
    );
    setPlan(qs);
    setIdx(0);
    setTurns([]);
    setReport(null);
    setNote(null);
    setEngine("offline");
    setTyping(typed);
    setPhase("live");
    setStep("intro");
    scrollTo(".iv-live");
    await say(
      opening(
        project,
        settings.modes,
        settings.level,
        Math.min(settings.count, qs.length),
        interviewerName,
      ),
    );
    if (session.current === sid) await ask(qs[0]!, sid);
  }, [project, settings, support.stt, say, ask, mic]);

  const finish = useCallback(
    async (all: Turn[], sid: number) => {
      speaker.cancel();
      dict.stop();
      if (!all.length || !project) {
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
            modes: settings.modes,
            level: settings.level,
            turns: all.map(({ question, answer, seconds, feedback, delivery }) => ({
              question,
              answer,
              seconds,
              spoken: delivery.spoken,
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
          modes: settings.modes,
          overall: r.overall,
        },
        ...readList<PastSession>(HISTORY_KEY),
      ].slice(0, 12);
      write(HISTORY_KEY, past);
      setHistory(past);
      scrollTo(".ivr");
      await say(
        `That's the end of the interview. You scored ${r.overall} out of 100: ${r.verdict}. ${r.summary}`,
      );
    },
    [project, settings.modes, settings.level, speaker, dict, say],
  );

  const submit = useCallback(async () => {
    if (!project || !question || step !== "answer") return;
    const text = answer.trim();
    if (text.length < 2) return;
    const spoken = dict.heard;
    const sid = session.current;
    dict.stop();
    speaker.cancel();
    const seconds = Math.max(1, Math.round((Date.now() - answerStart) / 1000));
    setStep("scoring");
    const remaining = total - (idx + 1);
    let feedback: Feedback;
    let next: Question | null = null;
    let delivery = analyzeDelivery(text, seconds, spoken);
    try {
      const res = await fetch("/api/v1/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "turn",
          projectId: project.id,
          modes: settings.modes,
          level: settings.level,
          history: turns.map((t) => ({ question: t.question.text, answer: t.answer })),
          question,
          answer: text,
          seconds,
          spoken,
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
    // Space is push-to-talk everywhere except text fields, even when a button has focus
    // (otherwise it "clicks" the focused button, e.g. Repeat question)
    const editable = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
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

  const choose = (p: InterviewProject) => {
    morph(() => setProject(p));
    try {
      // keep the URL in sync so a reload keeps the project
      window.history.replaceState(null, "", `/interview?project=${encodeURIComponent(p.id)}`);
    } catch {
      /* ignore */
    }
  };
  const pick = (p: ProjectOption) =>
    choose(initial && p.id === initial.id ? initial : { ...p, summary: null, mentors: [] });
  const clearSubject = () => {
    morph(() => setProject(null));
    try {
      window.history.replaceState(null, "", "/interview");
    } catch {
      /* ignore */
    }
  };

  const pickById = (id: string) => {
    const p = projects.find((x) => x.id === id || x.alsoIds?.includes(id));
    if (p) pick(p);
  };

  const toggleMode = (m: Mode | "all") =>
    setSettings((s) => {
      if (m === "all")
        return { ...s, modes: s.modes.length === MODE_KEYS.length ? [] : [...MODE_KEYS] };
      const modes = s.modes.includes(m)
        ? s.modes.filter((x) => x !== m)
        : MODE_KEYS.filter((x) => x === m || s.modes.includes(x));
      return { ...s, modes };
    });
  const everything = settings.modes.length === MODE_KEYS.length;
  const ready = !!project && settings.modes.length > 0 && settings.count > 0;
  const cap = maxQuestions(settings.modes);

  const preview = (v: VoiceOption | null) => {
    if (!v) {
      speaker.cancel();
      return setPreviewing(null);
    }
    // speak() itself stops the voice that is talking before the new one starts
    setPreviewing(v.id);
    void speaker
      .speak(sample(v.persona, project), {
        voice: v.id,
        rate: settings.rate,
        volume: settings.volume,
      })
      .then(() => setPreviewing((cur) => (cur === v.id ? null : cur)));
  };

  /* ------------------------------ setup ------------------------------ */
  if (phase === "setup") {
    const best = history.length ? Math.max(...history.map((h) => h.overall)) : null;
    return (
      <div className="iv" data-testid="interview-setup">
        <div className="iv-setup">
          <div className={`iv-pair ${project ? "has-subject" : ""}`}>
            <section
              className="iv-panel iv-subject"
              aria-labelledby="iv-project-h"
              style={{ viewTransitionName: "iv-subject" }}
            >
              <div className="iv-step">1</div>
              <h2 id="iv-project-h" className="iv-h">
                What will you talk about?
              </h2>
              <p className="iv-sub">
                Paste the repository you contribute to. Already picked a recorded mentorship idea?
                Use the second tab.
              </p>
              <div className="iv-source" role="tablist" aria-label="Interview subject">
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "repo"}
                  onClick={() => setSource("repo")}
                  data-testid="repo-tab"
                >
                  Paste your repo link
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "list"}
                  onClick={() => setSource("list")}
                >
                  Mentorship projects
                </button>
              </div>
              {/* a repository subject is shown inside the repository lookup itself */}
              {project && !(source === "repo" && project.id.startsWith("repo:")) ? (
                <div className="iv-picked" data-testid="picked-project">
                  <div>
                    <span className="iv-picked-k">Interview subject</span>
                    <strong>{project.name}</strong>
                    <span className="dim">
                      {[project.org, project.program].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {project.technologies.length > 0 && (
                    <div className="chips">
                      {project.technologies.slice(0, 6).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="button" className="iv-picked-clear" onClick={clearSubject}>
                    Change
                  </button>
                </div>
              ) : null}
              {source === "repo" ? (
                <RepoLookup
                  onUse={choose}
                  onPickProject={pickById}
                  onClear={clearSubject}
                  activeId={project?.id ?? ""}
                />
              ) : (
                <>
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
                          aria-selected={p.id === project?.id}
                          onClick={() => pick(p)}
                        >
                          <span className="iv-p-name">{p.name}</span>
                          <span className="iv-p-meta">
                            {[
                              p.org,
                              p.when[0] &&
                                `${p.when[0].replace(/\s*\(.*\)$/, "")}${p.when.length > 1 ? ` +${p.when.length - 1}` : ""}`,
                              p.technologies.slice(0, 3).join(", "),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                    {!filtered.length && (
                      <li className="dim iv-empty">No project matches “{query}”.</li>
                    )}
                  </ul>
                </>
              )}
            </section>

            <section
              className="iv-panel iv-types"
              aria-labelledby="iv-mode-h"
              style={{ viewTransitionName: "iv-types" }}
            >
              <div className="iv-step">2</div>
              <h2 id="iv-mode-h" className="iv-h">
                Choose the interview
              </h2>
              <p className="iv-sub">Pick one or more. Questions take turns between them.</p>
              <div
                className="iv-modes"
                role="group"
                aria-label="Interview types"
                data-testid="modes"
              >
                <button
                  type="button"
                  aria-pressed={everything}
                  className="iv-mode iv-mode-all"
                  onClick={() => toggleMode("all")}
                >
                  <span className="iv-check" aria-hidden="true" />
                  <Icon d={ALL_ICON} size={20} />
                  <strong>Everything</strong>
                  <span>A full mock interview: questions from all five types.</span>
                </button>
                {MODE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={settings.modes.includes(k)}
                    className="iv-mode"
                    onClick={() => toggleMode(k)}
                  >
                    <span className="iv-check" aria-hidden="true" />
                    <Icon d={MODE_ICON[k]} size={20} />
                    <strong>{MODES[k].label}</strong>
                    <span>{MODES[k].blurb}</span>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="iv-panel iv-pace-panel"
              aria-labelledby="iv-len-h"
              style={{ viewTransitionName: "iv-length" }}
            >
              <div className="iv-step">3</div>
              <h2 id="iv-len-h" className="iv-h">
                Level and length
              </h2>
              <div className="iv-pace-row">
                <div className="iv-pace-level">
                  <div className="iv-label" style={{ marginTop: 14 }}>
                    Level
                  </div>
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
                <div className="iv-pace-length">
                  <div className="iv-label" style={{ marginTop: 14 }}>
                    Interview length
                  </div>
                  <div className="iv-counts" role="radiogroup" aria-label="Number of questions">
                    {COUNTS.map((c) => {
                      const n = cap ? Math.min(c.n, cap) : c.n;
                      return (
                        <button
                          key={c.n}
                          type="button"
                          role="radio"
                          aria-checked={settings.count === c.n}
                          onClick={() => update("count", c.n)}
                        >
                          <span className="iv-count-n">{n}</span>
                          <span className="iv-count-t">
                            <strong>{c.label}</strong>
                            <span>~{n * 2} min</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section
            className="iv-panel"
            aria-labelledby="iv-voice-h"
            style={{ viewTransitionName: "iv-voice" }}
          >
            <div className="iv-step">4</div>
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
              <VoicePicker
                voices={speaker.voices}
                value={settings.voice}
                onChange={(id) => {
                  // picking another interviewer stops whoever is talking
                  if (previewing) preview(null);
                  update("voice", id);
                }}
                rate={settings.rate}
                onRate={(r) => update("rate", r)}
                volume={settings.volume}
                onVolume={(v) => update("volume", v)}
                onPreview={preview}
                previewing={previewing}
              />
            )}
            {support.stt && settings.voiceIn && (
              <div className={`iv-micperm is-${mic.state}`} data-testid="mic-permission">
                <span className="iv-micperm-icon" aria-hidden="true">
                  <Icon d={MIC} size={20} />
                </span>
                <div className="iv-micperm-text">
                  <strong>
                    {mic.state === "granted"
                      ? "Microphone ready"
                      : mic.state === "denied"
                        ? "Microphone is blocked"
                        : "Allow your microphone"}
                  </strong>
                  <span>
                    {mic.state === "granted"
                      ? "Speak to test it: the bar should move."
                      : mic.state === "denied"
                        ? "Click the lock or settings icon left of the web address, set Microphone to Allow, then reload this page. You can also type your answers."
                        : "Your browser will ask for permission. Choose Allow so you can answer out loud."}
                  </span>
                  {mic.state === "granted" && (
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
                  )}
                </div>
                {mic.state === "granted" ? (
                  <button type="button" className="btn sm" onClick={() => setMicTest((m) => !m)}>
                    <Icon d={micTest ? STOP : MIC} size={16} /> {micTest ? "Stop test" : "Test mic"}
                  </button>
                ) : mic.state !== "denied" ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() =>
                      void mic.request().then((st: string) => setMicTest(st === "granted"))
                    }
                    data-testid="allow-mic"
                  >
                    Allow microphone
                  </button>
                ) : (
                  <button type="button" className="btn sm" onClick={() => location.reload()}>
                    Reload page
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={`iv-launch ${ready ? "is-ready" : ""}`}>
          <div className="iv-launch-copy">
            {ready && project ? (
              <>
                <strong>
                  {Math.min(settings.count, cap)} questions on {project.name}:{" "}
                  {everything ? "everything" : modesLabel(settings.modes)}
                </strong>
                <span className="dim">
                  {aiReady
                    ? signedIn
                      ? "The AI interviewer adapts follow-ups to what you say and scores every answer."
                      : "Sign in for the AI interviewer. Without it, the offline coach scores your answers."
                    : "The offline coach scores your answers on relevance, project knowledge, depth, structure and clarity."}
                </span>
              </>
            ) : (
              <>
                <strong>Almost ready</strong>
                <ul className="iv-todo" data-testid="setup-todo">
                  <li className={project ? "done" : ""}>
                    {project
                      ? `Subject: ${project.name}`
                      : "Paste your repo link or pick a project"}
                  </li>
                  <li className={settings.modes.length ? "done" : ""}>
                    {settings.modes.length
                      ? `Interview: ${everything ? "Everything" : modesLabel(settings.modes)}`
                      : "Choose at least one interview type"}
                  </li>
                  <li className={settings.count ? "done" : ""}>
                    {settings.count
                      ? `Length: ${cap ? Math.min(settings.count, cap) : settings.count} questions`
                      : "Choose the interview length"}
                  </li>
                </ul>
              </>
            )}
          </div>
          <button
            type="button"
            className="btn primary lg iv-start"
            onClick={() => void start()}
            disabled={!ready}
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
                  title={`${h.project} · ${pastLabel(h)} · ${h.overall}`}
                />
              ))}
            </div>
            <ul className="iv-hist">
              {history.slice(0, 4).map((h, i) => (
                <li key={i}>
                  <span>{h.project}</span>
                  <span className="dim">{pastLabel(h)}</span>
                  <strong>{h.overall}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // past setup there is always a subject
  if (!project) return null;

  /* ------------------------------ report ------------------------------ */
  if (phase === "report" && report) {
    return (
      <ReportView
        report={report}
        turns={turns}
        project={project}
        modes={settings.modes}
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
          <span className="dim"> · {modesTitle(settings.modes)}</span>
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
            {question?.mode && settings.modes.length > 1 && (
              <span className="iv-chip iv-chip-mode">{MODES[question.mode].label}</span>
            )}
            {question?.followUp && <span className="iv-chip">Follow-up</span>}
          </div>
          <p className="iv-question" data-testid="question">
            {question?.text ??
              opening(project, settings.modes, settings.level, total, interviewerName)}
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
            {(micBlocked || /blocked/i.test(dict.error ?? "")) && (
              <div className="iv-micalert" role="alert" data-testid="mic-blocked">
                <strong>Your microphone is blocked, so you can type for now.</strong>
                <span>
                  To answer out loud: click the lock or settings icon left of the web address, set
                  Microphone to Allow, then reload the page.
                </span>
              </div>
            )}
            {dict.error && !/blocked/i.test(dict.error) && (
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
                onClick={async (e) => {
                  e.currentTarget.blur();
                  if (dict.listening) return dict.stop();
                  if (mic.state !== "granted" && (await mic.request()) !== "granted")
                    return setMicBlocked(true);
                  setMicBlocked(false);
                  setTyping(false);
                  dict.start();
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
          {f.empty ? "—" : f.overall}
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
          {turn.delivery.spoken ? (
            <>
              <span>{fmt(turn.seconds)} spoken</span>
              {turn.delivery.wpm && <span>{turn.delivery.wpm} words/min</span>}
              <span>{turn.delivery.fillerCount} fillers</span>
            </>
          ) : (
            <span>typed</span>
          )}
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
