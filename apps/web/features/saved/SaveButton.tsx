"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

export type SaveEntityType = "PROJECT" | "REPOSITORY" | "ORGANIZATION";

/**
 * Real, persisted save toggle: POST / DELETE /api/v1/saved with optimistic UI and rollback on
 * failure. Unsaving asks for confirmation first.
 */
export function SaveButton({
  entityType,
  entityId,
  initialSaved,
  compact = false,
  label,
}: {
  entityType: SaveEntityType;
  entityId: string;
  initialSaved: boolean;
  compact?: boolean;
  label?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const noun = label ?? "item";

  function onClick(e: MouseEvent) {
    // the button can sit on top of a card link; never follow it
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (saved) setConfirming(true);
    else void toggle();
  }

  async function toggle() {
    setConfirming(false);
    const next = !saved;
    setSaved(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/saved", {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (!res.ok)
        throw new Error(res.status === 401 ? "Sign in to save." : "Could not update saved items.");
      router.refresh();
    } catch (e) {
      setSaved(!next);
      setError(e instanceof Error ? e.message : "Could not update saved items.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
    >
      <button
        type="button"
        className={`save${compact ? " icon" : ""}`}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${noun}` : `Save ${noun}`}
        onClick={onClick}
        disabled={busy}
        data-testid="save-button"
        data-saved={saved}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
        </svg>
        {!compact && (saved ? "Saved" : "Save")}
      </button>
      <span role="status" aria-live="polite" className="hint" style={{ minHeight: 0 }}>
        {error}
      </span>
      {confirming && (
        <ConfirmDialog
          title={`Remove ${label ?? "this item"} from saved?`}
          confirmLabel="Unsave"
          danger
          onConfirm={() => void toggle()}
          onCancel={() => setConfirming(false)}
          testId="unsave-confirm"
        >
          <p style={{ margin: 0 }}>
            Are you sure you want to unsave it? You can save it again any time.
          </p>
        </ConfirmDialog>
      )}
    </span>
  );
}
