"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
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
        let fin = "";
        let mid = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]!;
          if (res.isFinal) fin += res[0].transcript;
          else mid += res[0].transcript;
        }
        if (fin) setFinalText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${fin.trim()}`);
        setInterim(mid);
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

function describe(v: SpeechSynthesisVoice): VoiceOption {
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
      MALE.test(v.name) && !/female/i.test(v.name) ? "Male" : FEMALE.test(v.name) ? "Female" : null,
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

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, opts: { voice?: string; rate?: number } = {}) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window) || !text.trim()) return resolve();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(speakable(text));
        const v = voices.find((x) => x.voiceURI === opts.voice) ?? voices[0];
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        }
        u.rate = opts.rate ?? 1;
        u.pitch = 1;
        const done = () => {
          if (current.current === u) setSpeaking(false);
          resolve();
        };
        u.onend = done;
        u.onerror = done;
        current.current = u;
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      }),
    [voices],
  );

  return { speak, cancel, speaking, voices: voices.map(describe) };
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
