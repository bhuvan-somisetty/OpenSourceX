"use client";

import { useMemo, useState } from "react";
import type { VoiceOption } from "./voice";

type Tab = "Female" | "Male" | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "Female", label: "Female" },
  { key: "Male", label: "Male" },
  { key: "all", label: "All" },
];
export const RATES = [
  { v: 0.85, label: "Slow" },
  { v: 0.95, label: "Relaxed" },
  { v: 1, label: "Normal" },
  { v: 1.12, label: "Brisk" },
] as const;

const PLAY = "M8 5v14l11-7z";
const STOP = "M7 7h10v10H7z";

const hash = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** Bar heights unique to each voice: a spoken phrase, taller in the middle. */
function signature(seed: string, n: number): number[] {
  let h = hash(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const r = (h % 1000) / 1000;
    const env = Math.sin(((i + 0.5) / n) * Math.PI);
    out.push(0.18 + 0.82 * env * (0.3 + 0.7 * r));
  }
  return out;
}

// orb colours stay in the brand's family: wine, rose and plum for female voices,
// indigo and violet for male ones
const HUES: Record<"Female" | "Male" | "Other", number[]> = {
  Female: [342, 330, 352, 318, 305],
  Male: [232, 248, 262, 218, 275],
  Other: [290, 200, 170],
};

/** A small glossy sphere per voice, with a sound mark that speaks while the voice plays. */
function VoiceOrb({ v, size, playing }: { v: VoiceOption; size: number; playing: boolean }) {
  const h = hash(v.id);
  const hues = HUES[v.gender ?? "Other"];
  const h1 = hues[h % hues.length]!;
  // the second hue leans toward plum for warm orbs and toward violet for cool ones, never orange
  const h2 = v.gender === "Female" ? h1 - 14 - (h % 18) : h1 + 14 + (h % 18);
  const bars = useMemo(() => signature(v.id, 5).map((x) => 0.35 + 0.65 * x), [v.id]);
  return (
    <span
      className={`iv-vorb ${playing ? "playing" : ""}`}
      style={{ ["--h1" as string]: h1, ["--h2" as string]: h2, width: size, height: size }}
      aria-hidden="true"
    >
      <span className="iv-vorb-mark">
        {bars.map((b, i) => (
          <i
            key={i}
            style={{ height: `${Math.round(b * 100)}%`, animationDelay: `${i * -0.17}s` }}
          />
        ))}
      </span>
    </span>
  );
}

function Wave({ v, playing }: { v: VoiceOption; playing: boolean }) {
  const hs = useMemo(() => signature(v.id + v.persona, 44), [v.id, v.persona]);
  return (
    <span className={`iv-vsig-lg ${playing ? "playing" : ""}`} aria-hidden="true">
      {hs.map((x, i) => (
        <i
          key={i}
          style={{ height: `${Math.round(x * 100)}%`, animationDelay: `${(i % 5) * -0.13}s` }}
        />
      ))}
    </span>
  );
}

/** One woman, one man, one woman...: the "All" list takes turns, voices of unknown gender last. */
function alternate(list: VoiceOption[]): VoiceOption[] {
  const f = list.filter((v) => v.gender === "Female");
  const m = list.filter((v) => v.gender === "Male");
  const out: VoiceOption[] = [];
  for (let i = 0; i < Math.max(f.length, m.length); i++) {
    if (f[i]) out.push(f[i]!);
    if (m[i]) out.push(m[i]!);
  }
  return [...out, ...list.filter((v) => !v.gender)];
}

/** Interviewer loudness, 0 to 100 percent; the speaker icon mutes and restores. */
function Volume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [before, setBefore] = useState(1);
  const pct = Math.round(value * 100);
  const icon =
    pct === 0
      ? "M11 5 6 9H2v6h4l5 4V5Zm5.5 4.5 5 5m0-5-5 5"
      : pct < 50
        ? "M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7"
        : "M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13";
  return (
    <div className="iv-vvol">
      <button
        type="button"
        className="iv-vvol-btn"
        aria-label={pct === 0 ? "Unmute interviewer" : "Mute interviewer"}
        onClick={() => {
          if (pct === 0) onChange(before || 1);
          else {
            setBefore(value);
            onChange(0);
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={icon} />
        </svg>
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label="Interviewer volume"
        aria-valuetext={`${pct} percent`}
        style={{ ["--p" as string]: `${pct}%` }}
      />
      <b>{pct}%</b>
    </div>
  );
}

function PlayIcon({ stop }: { stop?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={stop ? STOP : PLAY} />
    </svg>
  );
}

/** The chosen interviewer up front, every other voice one tap away, and the speaking speed. */
export function VoicePicker({
  voices,
  value,
  onChange,
  rate,
  onRate,
  volume,
  onVolume,
  onPreview,
  previewing,
}: {
  voices: VoiceOption[];
  value: string;
  onChange: (id: string) => void;
  rate: number;
  onRate: (r: number) => void;
  volume: number;
  onVolume: (v: number) => void;
  onPreview: (v: VoiceOption | null) => void;
  previewing: string | null;
}) {
  const counts = useMemo(() => {
    const c = { Female: 0, Male: 0 };
    for (const v of voices) if (v.gender) c[v.gender]++;
    return c;
  }, [voices]);
  const selected = voices.find((v) => v.id === value) ?? voices[0];
  const [tab, setTab] = useState<Tab>("all");
  const tabs = TABS.filter((t) => t.key === "all" || counts[t.key]);
  const shown = tab === "all" ? alternate(voices) : voices.filter((v) => v.gender === tab);
  const rateIndex = Math.max(
    0,
    RATES.findIndex((r) => Math.abs(rate - r.v) < 0.01),
  );

  if (!voices.length || !selected)
    return (
      <p className="hint">This browser has no voices installed. Questions will be shown as text.</p>
    );

  const selPlaying = previewing === selected.id;

  return (
    <div className="iv-voices">
      <div className="iv-vstage">
        {/* the interviewer who will ask the questions */}
        <div className={`iv-vhero ${selPlaying ? "playing" : ""}`}>
          <div className="iv-vhero-k">Your interviewer</div>
          <div className="iv-vhero-main" key={selected.id}>
            <Wave v={selected} playing={selPlaying} />
            <div className="iv-vhero-id">
              <VoiceOrb v={selected} size={80} playing={selPlaying} />
              <div className="iv-vhero-text">
                <strong>{selected.persona}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={`iv-vhero-play ${selPlaying ? "on" : ""}`}
            onClick={() => onPreview(selPlaying ? null : selected)}
          >
            <PlayIcon stop={selPlaying} />
            {selPlaying ? "Stop" : `Hear ${selected.persona}`}
          </button>

          <div className="iv-vspeed">
            <div className="iv-vspeed-head">
              <span>Speaking speed</span>
              <b>{RATES[rateIndex]!.v}×</b>
            </div>
            <div
              className="iv-vseg"
              role="radiogroup"
              aria-label="Speaking speed"
              style={{ ["--i" as string]: rateIndex, ["--n" as string]: RATES.length }}
            >
              <span className="iv-vseg-pill" aria-hidden="true" />
              {RATES.map((r, i) => (
                <button
                  key={r.v}
                  type="button"
                  role="radio"
                  aria-checked={i === rateIndex}
                  onClick={() => onRate(r.v)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <Volume value={volume} onChange={onVolume} />
        </div>

        {/* every voice this browser can speak with */}
        <div className="iv-vlist-wrap">
          <div className="iv-vtabs" role="tablist" aria-label="Voice">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="iv-vcount">{t.key === "all" ? voices.length : counts[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="iv-vlist" role="radiogroup" aria-label="Interviewer voice">
            {shown.map((v, i) => {
              const on = v.id === selected.id;
              const playing = previewing === v.id;
              return (
                <div
                  key={v.id}
                  className={`iv-vrow ${on ? "on" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.035}s` }}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="iv-vrow-main"
                    onClick={() => onChange(v.id)}
                    title={v.name}
                  >
                    <VoiceOrb v={v} size={52} playing={playing} />
                    <span className="iv-vrow-text">
                      <strong>{v.persona}</strong>
                    </span>
                    <span className="iv-vcheck" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="12" height="12">
                        <path
                          d="M3.5 8.5l3 3 6-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`iv-vplay ${playing ? "on" : ""}`}
                    aria-label={playing ? `Stop ${v.persona}` : `Hear ${v.persona}`}
                    onClick={() => onPreview(playing ? null : v)}
                  >
                    <PlayIcon stop={playing} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
