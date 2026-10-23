"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Browser voice for the interviewer, with no server and no cost:
 * - speech to text with the Web Speech API (Chrome, Edge, Safari),
 * - text to speech with speechSynthesis (every modern browser),
 * - a microphone level meter with Web Audio, used for the orb and the mic check.
 * Push-to-talk, toggle and silence auto-stop follow the patterns of desktop dictation apps
 * such as Handy (hold a key to talk, tap to toggle, stop on silence).
 */

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechSupport() {
  const [s, setS] = useState({ stt: false, tts: false, ready: false });
  useEffect(() => {
    setS({
      stt: !!recognitionCtor() && !!navigator.mediaDevices?.getUserMedia,
      tts: "speechSynthesis" in window,
      ready: true,
    });
  }, []);
  return s;
}

/** Live dictation. `finalText` accumulates; `interim` is the words still being recognized. */
export function useDictation(lang = "en-US") {
  const rec = useRef<Recognition | null>(null);
  const want = useRef(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState(0);
  /** true once speech was recognised for the current answer (false = typed) */
  const [heard, setHeard] = useState(false);
  // words still being recognised; kept when the mic stops so nothing said is lost
  const pending = useRef("");

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
    const last = pending.current.trim();
    pending.current = "";
    if (last) setFinalText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${last}`);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Use Chrome or Edge, or type.");
      return;
    }
    setError(null);
    want.current = true;
    if (!rec.current) {
      const r = new Ctor();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        // after stop() the in-progress words were already kept; late results would repeat them
        if (!want.current) return;
        let fin = "";
        let mid = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]!;
          if (res.isFinal) fin += res[0].transcript;
          else mid += res[0].transcript;
        }
        if (fin) setFinalText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${fin.trim()}`);
        setInterim(mid);
        pending.current = mid;
        setLastHeard(Date.now());
        if (fin || mid) setHeard(true);
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        want.current = false;
        setListening(false);
        setError(
          e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "Microphone access was blocked. Allow it in the address bar, or type your answer."
            : e.error === "network"
              ? "Voice recognition needs an internet connection. You can type instead."
              : "Voice input stopped. Press the mic to try again, or type.",
        );
      };
      // Browsers end recognition after a pause; restart while the user still wants to talk.
      r.onend = () => {
        if (want.current) {
          try {
            r.start();
          } catch {
            /* already started */
          }
        } else setListening(false);
      };
      rec.current = r;
    }
    try {
      rec.current.start();
    } catch {
      /* already started */
    }
    setLastHeard(Date.now());
    setListening(true);
  }, [lang]);

  // a new accent needs a new recognizer
  useEffect(() => {
    want.current = false;
    rec.current?.abort();
    rec.current = null;
    setListening(false);
  }, [lang]);

  const reset = useCallback((text = "") => {
    setFinalText(text);
    pending.current = "";
    setInterim("");
    setHeard(false);
  }, []);

  useEffect(
    () => () => {
      want.current = false;
      rec.current?.abort();
    },
    [],
  );

  return {
    listening,
    finalText,
    interim,
    error,
    lastHeard,
    heard,
    start,
    stop,
    reset,
    setFinalText,
  };
}

export type Region = "India" | "US" | "UK" | "Australia" | "Other";

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  region: Region;
  gender: "Female" | "Male" | null;
  natural: boolean;
  /** who makes the voice, from its system name ("Google US English" -> "Google") */
  provider: "Google" | "Microsoft" | "Apple" | null;
  /** the interviewer's name shown for this voice, e.g. "Pooja" */
  persona: string;
}

const PERSONAS = {
  Female: [
    "Disha",
    "Pooja",
    "Samantha",
    "Ananya",
    "Meera",
    "Riya",
    "Kavya",
    "Isha",
    "Nisha",
    "Tara",
  ],
  Male: [
    "Tarak",
    "Prabhas",
    "Rana",
    "Arjun",
    "Rohan",
    "Aditya",
    "Karan",
    "Vikram",
    "Nikhil",
    "Rahul",
  ],
  Other: ["Kiran", "Sam", "Alex", "Jordan", "Noor", "Ari"],
} as const;

/**
 * Give every voice an interviewer's name. Names follow the voice's gender and are handed out
 * in a fixed order of the voices' ids, so a voice keeps its name across visits.
 */
export function withPersonas(list: Omit<VoiceOption, "persona">[]): VoiceOption[] {
  const used = { Female: 0, Male: 0, Other: 0 };
  const names = new Map<string, string>();
  for (const v of [...list].sort((a, b) => a.id.localeCompare(b.id))) {
    const g = v.gender ?? "Other";
    const pool = PERSONAS[g];
    const i = used[g]++;
    names.set(
      v.id,
      i < pool.length ? pool[i]! : `${pool[i % pool.length]} ${Math.floor(i / pool.length) + 1}`,
    );
  }
  return list.map((v) => ({ ...v, persona: names.get(v.id)! }));
}

const FEMALE =
  /female|zira|heera|neerja|swara|kalpana|aria|jenny|sonia|libby|hazel|susan|samantha|karen|moira|tessa|veena|lekha|catherine|natasha|clara|emma|ava|michelle|\bana\b|sara|isha/i;
const MALE =
  /\bmale|david|mark|ravi|prabhat|madhur|hemant|guy|ryan|george|thomas|daniel|james|william|liam|connor|christopher|eric|roger|steffan|brian|andrew|rishi|aaron|fred/i;

function region(lang: string): Region {
  const l = lang.toLowerCase();
  if (l.endsWith("-in")) return "India";
  if (l === "en-us") return "US";
  if (l === "en-gb") return "UK";
  if (l === "en-au") return "Australia";
  return "Other";
}

function describe(v: SpeechSynthesisVoice): Omit<VoiceOption, "persona"> {
  const name = v.name
    .replace(/^(Microsoft|Google)\s+/, "")
    .replace(/\s*Online\s*\(Natural\)/i, "")
    .replace(/\s*-\s*English.*$/i, "")
    .trim();
  return {
    id: v.voiceURI,
    name,
    lang: v.lang,
    region: region(v.lang),
    gender:
      MALE.test(v.name) && !/female/i.test(v.name)
        ? "Male"
        : FEMALE.test(v.name) || /^Google US English$/i.test(v.name) // Google's US voice is female
          ? "Female"
          : null,
    natural: /natural|neural|online|google/i.test(v.name),
    provider: /^google\s/i.test(v.name)
      ? "Google"
      : /^microsoft\s/i.test(v.name)
        ? "Microsoft"
        : /com\.apple\./i.test(v.voiceURI)
          ? "Apple"
          : null,
  };
}

/** True when the visitor is most likely in India, so Indian voices and accent come first. */
export function prefersIndian(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return /Kolkata|Calcutta/.test(tz) || /-IN$|^hi/i.test(navigator.language);
  } catch {
    return false;
  }
}

/** Interviewer voice: English voices only, Indian English first for visitors in India. */
export function useSpeaker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const india = prefersIndian();
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const usable = all.filter((v) => /^en/i.test(v.lang));
      const rank = (v: SpeechSynthesisVoice) => {
        const d = describe(v);
        return (
          (india && d.region === "India" ? 0 : 10) +
          (/natural|neural|online/i.test(v.name) ? 0 : 2) +
          (/google/i.test(v.name) ? 0 : 1)
        );
      };
      setVoices((usable.length ? usable : all).sort((a, b) => rank(a) - rank(b)));
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  // every speak or cancel bumps this, so a voice that was asked for and then replaced never starts
  const generation = useRef(0);
  // live volume, 0 to 1: read by every piece of speech as it starts
  const volume = useRef(1);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The speech now playing, kept as sentences so it can be picked up again: a browser fixes an
   * utterance's volume when it starts, so a volume change restarts the current sentence from
   * the word it had reached (or from its start, for voices that do not report words).
   */
  const session = useRef<{
    my: number;
    parts: string[];
    index: number;
    /** where in the current sentence to start, after a restart */
    offset: number;
    /** start of the last word the voice reported, within the current sentence */
    word: number;
    voice: SpeechSynthesisVoice | undefined;
    rate: number;
    utterance: SpeechSynthesisUtterance | null;
    resolve: () => void;
  } | null>(null);

  const finish = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    current.current = null;
    setSpeaking(false);
    s.resolve();
  }, []);

  const play = useCallback(() => {
    const s = session.current;
    if (!s || s.my !== generation.current) return;
    if (s.index >= s.parts.length) return finish();
    const synth = window.speechSynthesis;
    const base = s.offset;
    const u = new SpeechSynthesisUtterance(s.parts[s.index]!.slice(base));
    if (s.voice) {
      u.voice = s.voice;
      u.lang = s.voice.lang;
    }
    u.rate = s.rate;
    u.pitch = 1;
    u.volume = volume.current;
    u.onboundary = (e) => {
      if (session.current === s && s.utterance === u && e.name === "word")
        s.word = base + e.charIndex;
    };
    const next = () => {
      // a restart or a cancel replaced this utterance: its end is not the sentence's end
      if (session.current !== s || s.utterance !== u) return;
      s.index++;
      s.offset = 0;
      s.word = 0;
      play();
    };
    u.onend = next;
    u.onerror = next;
    s.utterance = u;
    current.current = u;
    synth.speak(u);
  }, [finish]);

  const cancel = useCallback(() => {
    const my = ++generation.current;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Chrome's online voices can keep streaming through the first cancel: cancel again
      // a moment later unless something new has started since
      setTimeout(() => {
        if (generation.current === my) window.speechSynthesis.cancel();
      }, 80);
    }
    finish();
  }, [finish]);

  /** Change the interviewer's volume, live: what is being said continues at the new level. */
  const setVolume = useCallback(
    (v: number) => {
      const level = Math.min(1, Math.max(0, v));
      if (Math.abs(level - volume.current) < 0.005) return;
      volume.current = level;
      if (!session.current?.utterance || !("speechSynthesis" in window)) return;
      // while the slider is being dragged, restart once it settles, not on every step
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        const s = session.current;
        if (!s?.utterance) return;
        s.offset = s.word;
        s.utterance = null;
        window.speechSynthesis.cancel();
        setTimeout(play, 60);
      }, 140);
    },
    [play],
  );

  const speak = useCallback(
    (text: string, opts: { voice?: string; rate?: number; volume?: number } = {}) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window) || !text.trim()) return resolve();
        const synth = window.speechSynthesis;
        const busy = synth.speaking || synth.pending || session.current !== null;
        // whatever was playing stops; its caller carries on
        session.current?.resolve();
        session.current = null;
        if (restartTimer.current) clearTimeout(restartTimer.current);
        const my = ++generation.current;
        synth.cancel();
        if (opts.volume != null) volume.current = Math.min(1, Math.max(0, opts.volume));
        const spoken = speakable(text);
        session.current = {
          my,
          parts: spoken.match(/[^.!?]+[.!?]*\s*/g)?.filter((p) => p.trim()) ?? [spoken],
          index: 0,
          offset: 0,
          word: 0,
          voice: voices.find((x) => x.voiceURI === opts.voice) ?? voices[0],
          rate: opts.rate ?? 1,
          utterance: null,
          resolve,
        };
        setSpeaking(true);
        // speaking straight after a cancel can be dropped, or leave the old voice talking,
        // so give the engine a beat to let go of the previous voice first
        if (busy) setTimeout(play, 120);
        else play();
      }),
    [voices, play],
  );

  const options = useMemo(() => withPersonas(voices.map(describe)), [voices]);
  return { speak, cancel, setVolume, speaking, voices: options };
}

/**
 * Text as a speech engine should read it: "5/10" becomes "5 out of 10" (not "510"), symbols
 * become words, and Markdown and quote marks are dropped.
 */
export function speakable(text: string): string {
  return text
    .replace(/\*\*|__|`|#+\s/g, "")
    .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/g, "$1 out of $2")
    .replace(/×\s*(\d+)/g, " $1 times")
    .replace(/(\d+(?:\.\d+)?)\s*×/g, "$1 times")
    .replace(/(\d+)\s*%/g, "$1 percent")
    .replace(/\bwpm\b/gi, "words a minute")
    .replace(/~\s*(\d)/g, "about $1")
    .replace(/\be\.g\./gi, "for example")
    .replace(/\bi\.e\./gi, "that is")
    .replace(/\bQ(\d+)\b/g, "question $1")
    .replace(/&/g, " and ")
    .replace(/[·•|]/g, ", ")
    .replace(/\s[–—-]\s/g, ", ")
    .replace(/["“”‘’]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type MicPermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

/**
 * Microphone permission. `request()` must run inside a click: browsers only show their
 * "Allow microphone" prompt for a user gesture, and speech recognition started later (after the
 * interviewer finishes speaking) is refused when permission was never granted.
 */
export function useMicPermission() {
  const [state, setState] = useState<MicPermission>("unknown");
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    let status: PermissionStatus | null = null;
    const update = () => {
      if (status) setState(status.state as MicPermission);
    };
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((s) => {
        status = s;
        update();
        s.addEventListener("change", update);
      })
      .catch(() => setState("prompt"));
    return () => status?.removeEventListener("change", update);
  }, []);
  const request = useCallback(async (): Promise<MicPermission> => {
    if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setState("granted");
      return "granted";
    } catch {
      setState("denied");
      return "denied";
    }
  }, []);
  return { state, request };
}

/** Microphone loudness from 0 to 1, sampled every animation frame while `on`. */
export function useMicLevel(on: boolean) {
  const [level, setLevel] = useState(0);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!on || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let stopped = false;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        let smooth = 0;
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const b of buf) sum += ((b - 128) / 128) ** 2;
          const rms = Math.sqrt(sum / buf.length);
          smooth = smooth * 0.75 + Math.min(1, rms * 5) * 0.25;
          setLevel(smooth);
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => setDenied(true));
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      setLevel(0);
    };
  }, [on]);
  return { level, denied };
}
