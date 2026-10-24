"use client";

import { useEffect, useRef, useState } from "react";

const TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3";
const WARN =
  "M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

/**
 * A delete button that asks first: a small confirmation card opens beside it ("Delete …? This
 * can't be undone." Cancel · Delete) instead of a browser pop-up. Esc or a click elsewhere
 * closes it, and focus starts on Cancel, so nothing is removed without a deliberate second click.
 */
export function ConfirmDelete({
  what,
  onConfirm,
  compact = false,
}: {
  /** what is being deleted, e.g. "this interview" */
  what: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  /** an icon-only button */
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!asking) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && !busy && setAsking(false);
    const click = (e: MouseEvent) => {
      if (!busy && box.current && !box.current.contains(e.target as Node)) setAsking(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [asking, busy]);

  return (
    <span className="cdel-wrap" ref={box}>
      <button
        type="button"
        className={`cdel ${compact ? "cdel-icon" : ""} ${asking ? "is-open" : ""}`}
        aria-label={`Delete ${what}`}
        aria-expanded={asking}
        title={`Delete ${what}`}
        onClick={() => {
          setFailed(false);
          setAsking((v) => !v);
        }}
      >
        <Icon d={TRASH} />
        {!compact && "Delete"}
      </button>
      {asking && (
        <span className="cdel-pop" role="alertdialog" aria-label={`Delete ${what}?`}>
          <span className="cdel-pop-icon">
            <Icon d={WARN} size={18} />
          </span>
          <span className="cdel-pop-text">
            <strong>{failed ? "Couldn't delete" : `Delete ${what}?`}</strong>
            <span>{failed ? "Something went wrong. Try again." : "This can't be undone."}</span>
          </span>
          <span className="cdel-pop-actions">
            <button
              type="button"
              className="cdel-no"
              disabled={busy}
              autoFocus
              onClick={() => setAsking(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cdel-yes"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await onConfirm();
                setBusy(false);
                if (ok === false) setFailed(true);
                else setAsking(false);
              }}
            >
              <Icon d={TRASH} size={14} />
              {busy ? "Deleting…" : "Delete"}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
