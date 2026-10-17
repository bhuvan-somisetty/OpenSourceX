import { formatInfoDate, stipendTable, type ProgramInfo } from "@/lib/program-info";
import { StipendLookup } from "@/features/programs/StipendLookup";

const STATUS: Record<ProgramInfo["status"], { label: string; cls: string }> = {
  open: { label: "Applications open", cls: "is-open" },
  running: { label: "Running", cls: "is-running" },
  concluded: { label: "Concluded", cls: "is-concluded" },
};

/** Everything a mentee needs to know about a program: stipend first, then the details. */
export async function ProgramInfoBox({ info }: { info: ProgramInfo }) {
  const s = info.stipend;
  const table = await stipendTable(s?.table);
  const status = STATUS[info.status];

  return (
    <section className="card pinfo" aria-labelledby="pinfo-h" data-testid="program-info">
      <div className="pinfo-top">
        <div className="pinfo-stipend">
          <span className="eyebrow" id="pinfo-h">
            {s ? "Selected mentees receive" : "Funding"}
          </span>
          <div className="pinfo-amount">{s ? s.headline : "No mentee stipend"}</div>
          {s?.yearNote && <span className="pill pinfo-year">{s.yearNote}</span>}
        </div>
        <div className="pinfo-meta">
          <span className={`pinfo-status ${status.cls}`}>{status.label}</span>
          <span className="dim">Run by {info.runBy}</span>
        </div>
      </div>

      {info.statusNote && <p className="pinfo-note">{info.statusNote}</p>}
      <p className="pinfo-summary">{info.summary}</p>
      {s && <p className="pinfo-detail">{s.detail}</p>}

      {s?.ranges && (
        <div className="pinfo-ranges">
          {s.ranges.map((r) => (
            <div key={r.label} className="pinfo-range">
              <span className="dim">{r.label}</span>
              <strong>{r.value}</strong>
            </div>
          ))}
        </div>
      )}

      {table && <StipendLookup table={table} note={s?.tableNote} />}

      {s?.payments && s.payments.length > 0 && (
        <div className="pinfo-block">
          <h3>How the stipend is paid</h3>
          <ol className="pinfo-payments">
            {s.payments.map((p) => (
              <li key={p.label}>
                {p.share && <span className="pill">{p.share}</span>}
                <strong>{p.label}</strong>
                {p.when && <span className="dim"> · {p.when}</span>}
              </li>
            ))}
          </ol>
          {s.method && <p className="dim pinfo-small">{s.method}</p>}
        </div>
      )}
      {s?.notes?.map((n) => (
        <p key={n} className="dim pinfo-small">
          {n}
        </p>
      ))}

      {info.facts.length > 0 && (
        <dl className="pinfo-facts">
          {info.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {info.eligibility.length > 0 && (
        <details className="pinfo-section" open>
          <summary>Who can apply</summary>
          <ul>
            {info.eligibility.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      {info.timeline && info.timeline.length > 0 && (
        <details className="pinfo-section">
          <summary>{info.timelineTitle ?? "Timeline"}</summary>
          <ol className="pinfo-timeline">
            {info.timeline.map((t) => (
              <li key={t.label}>
                <span className="pinfo-date">{formatInfoDate(t.date)}</span>
                <span>{t.label}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {info.howToApply && info.howToApply.length > 0 && (
        <details className="pinfo-section">
          <summary>How to apply</summary>
          <ol>
            {info.howToApply.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </details>
      )}

      <div className="actions pinfo-links">
        {info.links.map((l, i) => (
          <a
            key={l.url}
            className={`btn${i === 0 ? " primary" : ""}`}
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {l.label} ↗
          </a>
        ))}
      </div>

      <p className="dim pinfo-sources">
        Checked {formatInfoDate(info.checked)} against{" "}
        {info.sources.map((src, i) => (
          <span key={src.url}>
            {i > 0 && (i === info.sources.length - 1 ? " and " : ", ")}
            <a href={src.url} target="_blank" rel="noreferrer noopener">
              {src.label}
            </a>
          </span>
        ))}
        . Copies of these pages are saved with the site.
      </p>
    </section>
  );
}
