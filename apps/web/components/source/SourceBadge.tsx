import type { SourceInfo } from "@opensourcex/database";
import { StatusChip } from "@/components/status/StatusChip";
import { day, liveLabel } from "@/lib/format";

/** Compact source rail: where this came from, how fresh, and whether it is live. */
export function SourceBadge({ source }: { source: SourceInfo }) {
  return (
    <div className="rail" data-testid="source-badge">
      <span className={`tier${source.tier === 2 ? " t2" : ""}`} aria-hidden="true" />
      <span>
        {source.providerName} · Tier {source.tier}
      </span>
      <StatusChip status={source.origin === "recorded" ? "RECORDED" : "CONFIRMED"} />
      <span>
        {source.origin === "recorded" ? "recorded" : "observed"} {day(source.fetchedAt)}
      </span>
      <StatusChip status={source.status} />
      {source.freshness === "stale" && <StatusChip status="STALE" />}
      <span className="muted">{liveLabel(source.ingestion)}</span>
    </div>
  );
}
