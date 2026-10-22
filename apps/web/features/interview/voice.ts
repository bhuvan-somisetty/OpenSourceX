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

  const reset = useCallback((text = "") => {
    setFinalText(text);
    setInterim("");
  }, []);

  useEffect(
    () => () => {
      want.current = false;
      rec.current?.abort();
    },
    [],
  );

  return { listening, finalText, interim, error, lastHeard, start, stop, reset, setFinalText };
}

export interface VoiceOption {
  id: string;
  label: string;
}

/** Interviewer voice. Prefers natural/online English voices when the browser has them. */
export function useSpeaker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const rank = (v: SpeechSynthesisVoice) =>
        (/natural|neural|online/i.test(v.name) ? 0 : 2) + (/google/i.test(v.name) ? 0 : 1);
      setVoices((en.length ? en : all).sort((a, b) => rank(a) - rank(b)));
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
        const u = new SpeechSynthesisUtterance(text);
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

  const options: VoiceOption[] = voices.map((v) => ({
    id: v.voiceURI,
    label: `${v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s*-\s*English.*$/, "")} (${v.lang})`,
  }));

  return { speak, cancel, speaking, voices: options };
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
