import Link from "next/link";
import type { Metadata } from "next";
import { loadLfxHistory } from "@opensourcex/database";
import { load } from "@/lib/data";
import { answerQuestion, EXAMPLE_QUESTIONS, type Answer } from "@/lib/ask";
import { first, type Params } from "@/lib/url";
import { DbDown } from "@/components/feedback/Notice";

export const metadata: Metadata = { title: "Ask about LFX Mentorship" };
export const dynamic = "force-dynamic";

/** Questions about CNCF in LFX Mentorship, answered only from the recorded term READMEs. */
export default async function Ask({ searchParams }: { searchParams: Promise<Params> }) {
  const q = first((await searchParams).q).slice(0, 300);
  const res = await load(loadLfxHistory);

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Ask</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Ask about CNCF in LFX Mentorship
        </h1>
        <p className="sub">
          Answers come only from the official term READMEs of the CNCF mentoring repository, every
          term from 2019 on. Each answer shows the numbers it counted and links its source.
        </p>
      </section>

      <form action="/ask" method="get" role="search" className="ask-form" data-testid="ask-form">
        <label htmlFor="ask-q" className="skip">
          Your question
        </label>
        <input
          id="ask-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={300}
          placeholder="e.g. Which CNCF projects repeat in every LFX term?"
          autoComplete="off"
        />
        <button className="btn primary" type="submit">
          Ask
        </button>
      </form>
      <div className="ask-examples" aria-label="Example questions">
        {EXAMPLE_QUESTIONS.map((e) => (
          <Link key={e} className="chip" href={`/ask?q=${encodeURIComponent(e)}`}>
            {e}
          </Link>
        ))}
      </div>

      {!res.ok ? <DbDown /> : <AnswerView a={answerQuestion(q, res.data)} asked={!!q} />}
    </div>
  );
}

function AnswerView({ a, asked }: { a: Answer; asked: boolean }) {
  return (
    <section
      className="card ask-answer"
      aria-live="polite"
      data-testid="ask-answer"
      data-kind={a.kind}
    >
      <div className="eyebrow">{asked ? "Answer" : "Overview"}</div>
      <h2 style={{ marginTop: 8 }}>{a.title}</h2>
      <p className="ask-summary" data-testid="ask-summary">
        {a.summary}
      </p>

      {a.table && a.table.rows.length > 0 && (
        <div className="scroll">
          <table className="stack" data-testid="ask-table">
            <thead>
              <tr>
                {a.table.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.table.rows.map((r, i) => (
                <tr key={i}>
                  <th scope="row">{r[0]}</th>
                  {r.slice(1).map((cell, j) => (
                    <td key={j} data-label={a.table!.columns[j + 1]}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {a.programs && a.programs.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Programs</h3>
          <ul className="ask-programs" data-testid="ask-programs">
            {a.programs.map((p) => (
              <li key={`${p.id}-${p.term}`}>
                <Link href={`/projects/${p.id}`}>{p.title}</Link>
                <div className="muted">
                  {p.cncfProject} · {p.term}
                  {p.mentors.length > 0 && <> · Mentors: {p.mentors.join(", ")}</>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {a.suggestions && (
        <p className="muted" style={{ marginTop: 16 }}>
          Try:{" "}
          {a.suggestions.map((s, i) => (
            <span key={s}>
              {i > 0 && " · "}
              <Link href={`/ask?q=${encodeURIComponent(s)}`}>{s}</Link>
            </span>
          ))}
        </p>
      )}

      <div className="ask-sources" data-testid="ask-sources">
        <span className="dim">Source:</span>{" "}
        {a.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          </span>
        ))}
        <span className="dim">
          {" "}
          · CNCF content, CC BY 4.0. CNCF projects only, not all of LFX Mentorship.
        </span>
      </div>
    </section>
  );
}
