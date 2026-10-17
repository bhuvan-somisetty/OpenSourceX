"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Confirmation dialog in the same style as the sign-out confirmation. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
  testId,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [busy, onCancel]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        data-testid={testId}
      >
        <h2 id="confirm-title" className="modal-title">
          {title}
        </h2>
        <div className="modal-description">{children}</div>
        <div className="modal-actions">
          <button type="button" className="btn sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn sm ${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
            data-testid={testId ? `${testId}-confirm` : undefined}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
