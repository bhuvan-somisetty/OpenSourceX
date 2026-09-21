"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type SaveEntityType = "PROJECT" | "REPOSITORY" | "ORGANIZATION";

/** Real, persisted save toggle: POST / DELETE /api/v1/saved with optimistic UI and rollback on failure. */
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
  const router = useRouter();
  const noun = label ?? "item";

  async function toggle() {
    if (busy) return;
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
        onClick={toggle}
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
    </span>
  );
}
