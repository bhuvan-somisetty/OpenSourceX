"use client";

import { useState } from "react";

const TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3";

/**
 * A delete button that asks first, in place: the button turns into "Delete …? Delete · Cancel"
 * instead of a browser pop-up. Nothing is removed until the second, explicit click.
 */
export function ConfirmDelete({
  what,
  onConfirm,
  compact = false,
}: {
  /** what is being deleted, e.g. "this interview" */
  what: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  /** an icon-only button until it is asked */
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!asking)
    return (
      <button
        type="button"
        className={`cdel ${compact ? "cdel-icon" : ""}`}
        aria-label={`Delete ${what}`}
        title={`Delete ${what}`}
        onClick={() => {
          setFailed(false);
          setAsking(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={TRASH} />
        </svg>
        {!compact && "Delete"}
      </button>
    );

  return (
    <span className="cdel-ask" role="group" aria-label={`Delete ${what}?`}>
      <span className="cdel-q">{failed ? "Couldn't delete. Try again?" : `Delete ${what}?`}</span>
      <button
        type="button"
        className="cdel-yes"
        disabled={busy}
        autoFocus
        onClick={async () => {
          setBusy(true);
          const ok = await onConfirm();
          setBusy(false);
          if (ok === false) setFailed(true);
          else setAsking(false);
        }}
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      <button type="button" className="cdel-no" disabled={busy} onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}
