import { asStatus, STATUS_META } from "@/lib/format";

/** One consistent status vocabulary. Never colour alone: glyph + label + hint. */
export function StatusChip({ status, label }: { status: string; label?: string }) {
  const m = STATUS_META[asStatus(status)];
  return (
    <span className={`chip ${m.cls}`} title={m.hint} data-status={asStatus(status)}>
      <span aria-hidden="true">{m.glyph}</span>
      {label ?? m.label}
    </span>
  );
}
