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

function Wave({ on }: { on: boolean }) {
  return (
    <span className={`iv-vwave ${on ? "on" : ""}`} aria-hidden="true">
      {[0.5, 0.9, 0.65, 1, 0.55].map((h, i) => (
        <i key={i} style={{ height: `${h * 100}%` }} />
      ))}
    </span>
  );
}

/** Voice cards grouped by accent, each with its own preview button. */
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
    indianFirst && voices.some((v) => v.region === "India") ? "India" : (selected?.region ?? "all"),
  );
  const shown = tab === "all" ? voices : voices.filter((v) => v.region === tab);
  const hasIndian = (counts.get("India") ?? 0) > 0;

  if (!voices.length)
    return (
      <p className="hint">This browser has no voices installed. Questions will be shown as text.</p>
    );

  return (
    <div className="iv-voices">
      <div className="iv-vhead">
        <div className="iv-label" style={{ margin: 0 }}>
          Interviewer voice
        </div>
        <div className="iv-vtabs" role="tablist" aria-label="Accent">
          {REGIONS.filter((r) => r.key === "all" || counts.get(r.key)).map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={tab === r.key}
              onClick={() => setTab(r.key)}
            >
              {r.code && <span className="iv-vcode">{r.code}</span>}
              {r.label}
              <span className="iv-vcount">
                {r.key === "all" ? voices.length : counts.get(r.key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="iv-vgrid" role="radiogroup" aria-label="Interviewer voice">
        {shown.map((v) => {
          const on = v.id === selected?.id;
          const playing = previewing === v.id;
          return (
            <div key={v.id} className={`iv-voice ${on ? "on" : ""}`}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                className="iv-voice-main"
                onClick={() => onChange(v.id)}
              >
                <span className={`iv-vavatar r-${v.region.toLowerCase()}`} aria-hidden="true">
                  {v.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="iv-vtext">
                  <strong>{v.name}</strong>
                  <span>
                    {ACCENT[v.region]}
                    {v.gender ? ` · ${v.gender}` : ""}
                  </span>
                  <span className="iv-vbadges">
                    {v.natural && <em>Natural</em>}
                    {on && <em className="sel">Selected</em>}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={`iv-vplay ${playing ? "on" : ""}`}
                aria-label={playing ? `Stop ${v.name}` : `Preview ${v.name}`}
                onClick={() => onPreview(playing ? null : v)}
              >
                {playing ? (
                  <Wave on />
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={PLAY} />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!hasIndian && (
        <div className="iv-vtip">
          <strong>Want a natural Indian English voice?</strong>
          <span>
            This browser has no Indian English voice yet. Open this page in <b>Microsoft Edge</b>{" "}
            for the natural Neerja and Prabhat voices, or on Windows add one in Settings, then Time
            &amp; language, then Speech, then Add voices, then English (India), and reload this
            page.
          </span>
        </div>
      )}

      <div className="iv-vfoot">
        <div>
          <div className="iv-label">Speaking speed</div>
          <div className="iv-rates" role="radiogroup" aria-label="Speaking speed">
            {RATES.map((r) => (
              <button
                key={r.v}
                type="button"
                role="radio"
                aria-checked={Math.abs(rate - r.v) < 0.01}
                onClick={() => onRate(r.v)}
              >
                <strong>{r.label}</strong>
                <span>{r.v}×</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`btn iv-vtry ${previewing ? "on" : ""}`}
          onClick={() => onPreview(previewing ? null : (selected ?? null))}
        >
          {previewing ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={STOP} />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={PLAY} />
              </svg>
              Hear {selected?.name ?? "voice"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
