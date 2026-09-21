import type { ReactNode } from "react";

/** Term ribbon: years across, terms down (or rows of programs). A real table with headers. */
export interface RibbonRow {
  label: ReactNode;
  cells: { key: string; content: ReactNode; title?: string; cls?: string }[];
}

export function TermRibbon({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: RibbonRow[];
}) {
  return (
    <div className="scroll" data-testid="term-ribbon">
      <table className="ribbon">
        <caption className="muted" style={{ textAlign: "left", paddingBottom: 8, fontSize: 13 }}>
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Program (granularity)</th>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r.label}</th>
              {r.cells.map((c) => (
                <td key={c.key}>
                  <span className={`cell ${c.cls ?? "c-unk"}`} title={c.title}>
                    {c.content}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
