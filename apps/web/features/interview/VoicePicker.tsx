"use client";

import { useMemo, useState } from "react";
import type { Region, VoiceOption } from "./voice";

const REGIONS: { key: Region | "all"; label: string; code: string }[] = [
  { key: "India", label: "Indian", code: "IN" },
  { key: "US", label: "American", code: "US" },
  { key: "UK", label: "British", code: "UK" },
  { key: "Australia", label: "Australian", code: "AU" },
  { key: "Other", label: "Other", code: "EN" },
  { key: "all", label: "All", code: "" },
];
const CODE: Record<Region, string> = {
  India: "IN",
  US: "US",
  UK: "UK",
  Australia: "AU",
  Other: "EN",
};
const ACCENT: Record<Region, string> = {
  India: "Indian English",
  US: "American English",
  UK: "British English",
  Australia: "Australian English",
  Other: "English",
};
export const RATES = [
  { v: 0.85, label: "Slow" },
  { v: 0.95, label: "Relaxed" },
  { v: 1, label: "Normal" },
  { v: 1.12, label: "Brisk" },
] as const;

const PLAY = "M8 5v14l11-7z";
const STOP = "M7 7h10v10H7z";

/**
 * A voice's own name as a person would say it. Google ships accent labels as names
 * ("US English", "UK English Female"); those read as "Google", with the accent and gender
 * shown beside it.
 */
export function voiceTitle(v: VoiceOption): string {
  if (/^(US|UK|Indian?|Australian?)\s+English(\s+(Fe)?male)?$/i.test(v.name))
    return [v.provider ?? "System", CODE[v.region], v.gender].filter(Boolean).join(" ");
  return v.name;
}

/** Bar heights unique to each voice, so every card has its own signature. */
function signature(seed: string, n: number): number[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    // a soft envelope, taller in the middle like a spoken phrase; small marks lean on the
    // voice's own randomness so no two look alike
    const env = Math.sin(((i + 0.5) / n) * Math.PI);
    const shape = n < 16 ? 0.35 + 0.65 * env : env;
    out.push(0.18 + 0.82 * shape * (0.3 + 0.7 * r));
  }
  return out;
}

function Signature({
  v,
  bars,
  playing,
  className,
}: {
  v: VoiceOption;
  bars: number;
  playing: boolean;
  className: string;
}) {
  const hs = useMemo(() => signature(v.id + v.name, bars), [v.id, v.name, bars]);
  return (
    <span
      className={`${className} r-${v.region.toLowerCase()} ${playing ? "playing" : ""}`}
      aria-hidden="true"
    >
      {hs.map((h, i) => (
        <i
          key={i}
          style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${(i % 5) * -0.13}s` }}
        />
      ))}
    </span>
  );
}

function PlayIcon({ stop }: { stop?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={stop ? STOP : PLAY} />
    </svg>
  );
}

/** The selected voice up front, every other voice one tap away, and the speaking speed. */
export function VoicePicker({
  voices,
  value,
  onChange,
  rate,
  onRate,
  onPreview,
  previewing,
  indianFirst,
}: {
  voices: VoiceOption[];
  value: string;
  onChange: (id: string) => void;
  rate: number;
  onRate: (r: number) => void;
  onPreview: (v: VoiceOption | null) => void;
  previewing: string | null;
  indianFirst: boolean;
}) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const v of voices) c.set(v.region, (c.get(v.region) ?? 0) + 1);
    return c;
  }, [voices]);
  const selected = voices.find((v) => v.id === value) ?? voices[0];
  const [tab, setTab] = useState<Region | "all">(() =>
    indianFirst && voices.some((v) => v.region === "India") ? "India" : "all",
  );
  const tabs = REGIONS.filter((r) => r.key === "all" || counts.get(r.key));
  const shown = tab === "all" ? voices : voices.filter((v) => v.region === tab);
  const hasIndian = (counts.get("India") ?? 0) > 0;
  const rateIndex = Math.max(
    0,
    RATES.findIndex((r) => Math.abs(rate - r.v) < 0.01),
  );

  if (!voices.length || !selected)
    return (
      <p className="hint">This browser has no voices installed. Questions will be shown as text.</p>
    );

  const selPlaying = previewing === selected.id;
  const meta = (v: VoiceOption) =>
    [
      ACCENT[v.region],
      voiceTitle(v).includes(v.gender ?? "~") ? null : v.gender,
      v.provider && !voiceTitle(v).startsWith(v.provider) ? v.provider : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="iv-voices">
      <div className="iv-vstage">
        {/* the voice that will ask the questions */}
        <div className={`iv-vhero ${selPlaying ? "playing" : ""}`}>
          <div className="iv-vhero-k">Interviewer voice</div>
          <div className="iv-vhero-main" key={selected.id}>
            <Signature v={selected} bars={44} playing={selPlaying} className="iv-vsig-lg" />
            <div className="iv-vhero-text">
              <strong>{voiceTitle(selected)}</strong>
              <span>{meta(selected)}</span>
              <span className="iv-vchips">
                <em className="code">{CODE[selected.region]}</em>
                <em className={selected.natural ? "nat" : ""}>
                  {selected.natural ? "Natural" : "Standard"}
                </em>
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`iv-vhero-play ${selPlaying ? "on" : ""}`}
            onClick={() => onPreview(selPlaying ? null : selected)}
          >
            <PlayIcon stop={selPlaying} />
            {selPlaying ? "Stop" : "Hear this voice"}
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
        </div>

        {/* every voice this browser can speak with */}
        <div className="iv-vlist-wrap">
          <div className="iv-vtabs" role="tablist" aria-label="Accent">
            {tabs.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={tab === r.key}
                onClick={() => setTab(r.key)}
              >
                {r.label}
                <span className="iv-vcount">
                  {r.key === "all" ? voices.length : counts.get(r.key)}
                </span>
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
                  >
                    <Signature v={v} bars={9} playing={playing} className="iv-vsig" />
                    <span className="iv-vrow-text">
                      <strong>
                        {voiceTitle(v)}
                        {v.natural && <em className="iv-vnat">Natural</em>}
                      </strong>
                      <span>{meta(v)}</span>
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
                    aria-label={playing ? `Stop ${voiceTitle(v)}` : `Preview ${voiceTitle(v)}`}
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

      {!hasIndian && (
        <div className="iv-vtip">
          <span className="iv-vtip-code" aria-hidden="true">
            IN
          </span>
          <div>
            <strong>Want an Indian English interviewer?</strong>
            <span>
              Open this page in <b>Microsoft Edge</b> for the natural Neerja and Prabhat voices, or
              add one on Windows and reload:
            </span>
            <ol className="iv-vsteps">
              <li>Settings</li>
              <li>Time &amp; language</li>
              <li>Speech</li>
              <li>Add voices</li>
              <li>English (India)</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
