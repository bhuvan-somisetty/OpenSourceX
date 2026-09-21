import type { Metadata } from "next";
import { dataSnapshot } from "@opensourcex/database";
import { PROVIDERS } from "@opensourcex/providers";
import { load, dataMode } from "@/lib/data";
import { DbDown, Notice } from "@/components/feedback/Notice";
import { StatusChip } from "@/components/status/StatusChip";
import { STATUS_META, day, liveLabel, type StatusKey } from "@/lib/format";

export const metadata: Metadata = { title: "Sources and status" };
export const dynamic = "force-dynamic";

const ALL: StatusKey[] = [
  "CONFIRMED",
  "HISTORICAL",
  "RECORDED",
  "DEVELOPMENT",
  "INFERRED",
  "UNKNOWN",
  "STALE",
  "FORECAST",
  "CONFLICTING",
  "PLACEHOLDER",
];

export default async function Sources() {
  const snap = await load(dataSnapshot);
  const m = dataMode();
  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Sources</div>
      <h1 className="page">Where the data comes from, and what is allowed</h1>
      <p className="sub">
        Every provider has a documented permission status. Nothing is fetched live in this build.
      </p>

      <Notice kind="dev" testId="mode-note">
        Data mode <strong>{m.mode.toUpperCase()}</strong> · live sources{" "}
        <strong>{m.liveSources ? "on" : "off"}</strong> · AI{" "}
        <strong>{m.aiEnabled ? "on" : "off"}</strong>. Live mode cannot be enabled by configuration
        until the owner records approval in the permission register.
      </Notice>

      <section style={{ marginTop: 24 }} aria-labelledby="prov">
        <h2 id="prov">Providers</h2>
        <div className="scroll">
          <table className="stack" data-testid="provider-table">
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Tier</th>
                <th scope="col">Coverage</th>
                <th scope="col">Live access</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.key}>
                  <th scope="row">
                    {p.name}
                    {p.ecosystem && (
                      <span className="tag" style={{ marginLeft: 8 }}>
                        {p.ecosystem} only
                      </span>
                    )}
                  </th>
                  <td data-label="Tier">{p.tier}</td>
                  <td data-label="Coverage">{p.coverage}</td>
                  <td data-label="Live access">
                    <StatusChip
                      status={p.ingestion === "blocked" ? "CONFLICTING" : "UNKNOWN"}
                      label={liveLabel(p.ingestion)}
                    />
                  </td>
                  <td data-label="Basis" style={{ maxWidth: 420 }}>
                    {p.licenceNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 32 }} aria-labelledby="rec">
        <h2 id="rec">Recorded snapshots in this build</h2>
        {!snap.ok ? (
          <DbDown />
        ) : (
          <div className="scroll">
            <table className="stack">
              <thead>
                <tr>
                  <th scope="col">Dataset</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Origin</th>
                  <th scope="col">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {snap.data.datasets.map((d) => (
                  <tr key={`${d.key}${d.origin}`}>
                    <th scope="row" className="mono">
                      {d.key}
                    </th>
                    <td data-label="Provider">{d.provider}</td>
                    <td data-label="Origin">
                      <StatusChip status={d.origin === "recorded" ? "RECORDED" : "CONFIRMED"} />
                    </td>
                    <td data-label="Recorded">{day(d.fetchedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }} aria-labelledby="leg">
        <h2 id="leg">Status vocabulary</h2>
        <ul className="crit" data-testid="status-vocabulary">
          {ALL.map((k) => (
            <li key={k}>
              <StatusChip status={k} />
              <span className="muted">{STATUS_META[k].hint}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
