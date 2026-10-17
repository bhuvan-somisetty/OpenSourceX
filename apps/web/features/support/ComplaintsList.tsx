"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Ticket } from "@opensourcex/database";
import { ConfirmDialog } from "./ConfirmDialog";

const CATEGORY: Record<string, string> = {
  bug: "Something is broken",
  ask: "Ask gave a wrong or bad answer",
  account: "Sign-in or account",
  content: "Wrong or missing information",
  security: "Security or privacy",
  other: "Something else",
};
export const STATUS: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
};
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function TicketBody({ t }: { t: Ticket }) {
  return (
    <>
      <p className="support-desc">{t.description}</p>
      {t.pageUrl && (
        <p className="hint" style={{ margin: "0 0 10px" }}>
          Page:{" "}
          <a href={t.pageUrl} target="_blank" rel="noopener noreferrer">
            {t.pageUrl}
          </a>
        </p>
      )}
      {t.attachments.length > 0 && (
        <div className="support-images">
          {t.attachments.map((a) => (
            <a
              key={a.id}
              className="support-thumb"
              href={`/api/v1/support/attachments/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={a.filename}
            >
              <img src={`/api/v1/support/attachments/${a.id}`} alt={a.filename} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {t.staffNote && (
        <p className="support-note">
          <strong>Reply from OpenSourceX:</strong> {t.staffNote}
        </p>
      )}
    </>
  );
}

export function ComplaintsList({ tickets, justSent }: { tickets: Ticket[]; justSent: boolean }) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/support/tickets/${withdrawing.id}/withdraw`, {
      method: "POST",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const p = await res?.json().catch(() => null);
      setError(p?.detail ?? "The complaint could not be withdrawn. Please try again.");
    }
    setWithdrawing(null);
    router.refresh();
  };

  return (
    <div className="support-list" data-testid="complaints">
      {justSent && (
        <p className="notice" role="status" data-testid="support-sent">
          Thanks, your report was sent. You can follow it here.
        </p>
      )}
      {error && (
        <p className="notice err" role="alert">
          {error}
        </p>
      )}
      {!tickets.length && (
        <section className="card support-empty">
          <h2>No complaints yet</h2>
          <p className="muted">When you report a problem, it appears here so you can track it.</p>
          <Link href="/support" className="btn primary">
            Report a problem
          </Link>
        </section>
      )}
      {tickets.map((t) => (
        <article
          key={t.id}
          className="card support-ticket"
          data-testid="complaint"
          data-status={t.status}
        >
          <header>
            <div>
              <h2>{t.subject}</h2>
              <p className="hint" style={{ margin: 0 }}>
                #{t.id} · {CATEGORY[t.category]} · sent {date(t.createdAt)}
                {t.withdrawnAt ? ` · withdrawn ${date(t.withdrawnAt)}` : ""}
              </p>
            </div>
            <span className={`support-status ${t.status}`}>{STATUS[t.status]}</span>
          </header>
          <TicketBody t={t} />
          {(t.status === "open" || t.status === "in_review") && (
            <div>
              <button
                type="button"
                className="btn sm danger"
                onClick={() => setWithdrawing(t)}
                data-testid="withdraw"
              >
                Withdraw
              </button>
            </div>
          )}
        </article>
      ))}

      {withdrawing && (
        <ConfirmDialog
          title="Withdraw this complaint?"
          confirmLabel="Withdraw"
          danger
          busy={busy}
          onConfirm={() => void withdraw()}
          onCancel={() => setWithdrawing(null)}
          testId="withdraw-confirm"
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>{withdrawing.subject}</strong>
          </p>
          <p style={{ margin: 0 }}>
            We will stop working on it. It stays in your list as withdrawn, and you can send a new
            report at any time.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
