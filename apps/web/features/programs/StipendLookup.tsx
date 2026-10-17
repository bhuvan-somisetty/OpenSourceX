"use client";

import { useState } from "react";
import type { StipendTable } from "@/lib/program-info";

const LABEL: Record<string, string> = {
  amount: "Stipend",
  small: "Small project",
  medium: "Medium project",
  large: "Large project",
};
const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    n,
  );

/** Pick a country, see the stipend the program publishes for it. */
export function StipendLookup({ table, note }: { table: StipendTable; note?: string }) {
  const [country, setCountry] = useState("India");
  const row = table.rows.find((r) => r.country === country) ?? null;

  return (
    <div className="pinfo-lookup">
      <label htmlFor="pinfo-country" className="pinfo-lookup-label">
        {note ?? "Stipend for your country"}
      </label>
      <select id="pinfo-country" value={country} onChange={(e) => setCountry(e.target.value)}>
        {table.rows.map((r) => (
          <option key={String(r.country)} value={String(r.country)}>
            {String(r.country)}
          </option>
        ))}
      </select>
      {row && (
        <div className="pinfo-lookup-result" aria-live="polite">
          {table.columns.map((c) => (
            <div key={c} className="pinfo-lookup-cell">
              <span className="dim">{LABEL[c] ?? c}</span>
              <strong>{money(Number(row[c]), table.currency)}</strong>
            </div>
          ))}
        </div>
      )}
      {table.paidIn && (
        <p className="dim pinfo-small">
          Paid in {table.paidIn} at the price on the day of payment.
        </p>
      )}
    </div>
  );
}
