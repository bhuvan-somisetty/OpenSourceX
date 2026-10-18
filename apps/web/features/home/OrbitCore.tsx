"use client";

import { useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";

/** The bow-and-arrow logo in the middle of the program ring: every tap looses an arrow. */
export function OrbitCore() {
  const [arrows, setArrows] = useState<number[]>([]);
  const [drawn, setDrawn] = useState(0);
  const next = useRef(0);

  const shoot = () => {
    const id = next.current++;
    setArrows((a) => [...a.slice(-6), id]);
    setDrawn((n) => n + 1);
  };

  return (
    <button type="button" className="home-orbit-core" onClick={shoot} aria-label="Shoot an arrow">
      <span key={drawn} className={drawn ? "home-core-logo recoil" : "home-core-logo"}>
        <LogoMark size={54} />
      </span>
      {arrows.map((id) => (
        <span
          key={id}
          className="home-arrow"
          aria-hidden="true"
          onAnimationEnd={() => setArrows((a) => a.filter((x) => x !== id))}
        >
          <svg width="64" height="14" viewBox="0 0 64 14" fill="none">
            <defs>
              <linearGradient
                id={`arrow-trail-${id}`}
                x1="0"
                y1="0"
                x2="64"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#9b7dff" stopOpacity="0.55" />
                <stop offset="1" stopColor="#e2e9ff" />
              </linearGradient>
            </defs>
            <path
              d="M2 7h52"
              stroke={`url(#arrow-trail-${id})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M52 2l10 5-10 5z" fill="#cdd8ff" />
            <path
              d="M4 7 0 2M4 7 0 12M9 7 5 2M9 7l-4 5"
              stroke="#9b7dff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ))}
    </button>
  );
}
