"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Ticket } from "@opensourcex/database";
import { STATUS, TicketBody } from "./ComplaintsList";

const date = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function StaffTicket({ t }: { t: Ticket }) {
  const router = useRouter();
  const [status, setStatus] = useState(t.status === "withdrawn" ? "open" : t.status);
  const [note, setNote] = useState(t.staffNote ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/v1/support/tickets/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note: note.trim() || undefined }),
    }).catch(() => null);
    setSaving(false);
    setMsg(res?.ok ? "Saved." : "Could not save.");
    router.refresh();
  };

  return (
    <article className="card support-ticket" data-status={t.status}>
      <header>
        <div>
          <h2>{t.subject}</h2>
          <p className="hint" style={{ margin: 0 }}>
            #{t.id} · {t.category} · {t.userName ?? "user"} ({t.userId.split(":")[0]}) ·{" "}
            {date(t.createdAt)}
          </p>
        </div>
        <span className={`support-status ${t.status}`}>{STATUS[t.status]}</span>
      </header>
      <TicketBody t={t} />
      {t.status !== "withdrawn" && (
        <div className="support-staff-actions">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            aria-label="Status"
          >
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            type="text"
            value={note}
            maxLength={2000}
            placeholder="Reply shown to the user (optional)"
            onChange={(e) => setNote(e.target.value)}
            aria-label="Reply to the user"
          />
          <button
            type="button"
            className="btn sm primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {msg && <span className="hint">{msg}</span>}
        </div>
      )}
    </article>
  );
}

export function StaffList({ tickets }: { tickets: Ticket[] }) {
  if (!tickets.length) return <p className="muted">No reports yet.</p>;
  return (
    <div className="support-list">
      {tickets.map((t) => (
        <StaffTicket key={t.id} t={t} />
      ))}
    </div>
  );
}
