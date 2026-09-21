import type { SourceInfo } from "@opensourcex/database";
import { StatusChip } from "@/components/status/StatusChip";
import { day, liveLabel } from "@/lib/format";

export function SourcePanel({ sources }: { sources: SourceInfo[] }) {
  if (!sources.length) return <p className="muted">No source recorded for this item.</p>;
  return (
    <div className="grid g2e" data-testid="source-panel">
      {sources.map((s) => (
        <div className="card" key={s.provenanceId}>
          <div className="chips" style={{ marginBottom: 8 }}>
            <StatusChip status={s.origin === "recorded" ? "RECORDED" : "CONFIRMED"} />
            <StatusChip status={s.status} />
            {s.freshness === "stale" && <StatusChip status="STALE" />}
          </div>
          <strong>{s.providerName}</strong>
          {s.derivation === "rule" && (
            <span className="tag" style={{ marginLeft: 8 }}>
              derived by rule {s.ruleId}
            </span>
          )}
          <dl className="kv">
            <dt>Source type</dt>
            <dd>
              {s.publisher} · Tier {s.tier}
            </dd>
            <dt>Dataset</dt>
            <dd className="mono">{s.dataset}</dd>
            <dt>Recorded</dt>
            <dd>
              {day(s.fetchedAt)} (
              {s.origin === "recorded" ? "saved snapshot, not fetched live" : "live"})
            </dd>
            <dt>Confidence</dt>
            <dd>
              {s.confidence} — {s.confidenceReason}
            </dd>
            <dt>Live access</dt>
            <dd>{liveLabel(s.ingestion)}</dd>
            <dt>Source URL</dt>
            <dd>
              {s.url.includes("{") ? (
                <span className="mono">
                  {s.url}{" "}
                  <span className="hint">(endpoint pattern; per-record URL not stored)</span>
                </span>
              ) : (
                <a href={s.url} rel="noreferrer noopener" target="_blank">
                  {s.url}
                </a>
              )}
            </dd>
          </dl>
        </div>
      ))}
    </div>
  );
}
