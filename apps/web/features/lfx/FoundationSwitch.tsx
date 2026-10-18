import Link from "next/link";

export interface FoundationSwitchItem {
  key: string;
  label: string;
  count: number;
}

/**
 * Switch between Linux Foundation projects on the LFX page. CNCF is the default (no query);
 * every other foundation is `?f=<key>`.
 */
export function FoundationSwitch({
  items,
  current,
  cncfCount,
}: {
  items: FoundationSwitchItem[];
  current: string;
  cncfCount?: number;
}) {
  const all = [{ key: "cncf", label: "CNCF", count: cncfCount ?? 0 }, ...items];
  return (
    <nav
      className="lfx-switch"
      aria-label="Linux Foundation projects"
      data-testid="foundation-switch"
    >
      {all.map((f) => (
        <Link
          key={f.key}
          href={f.key === "cncf" ? "/programs/lfx" : `/programs/lfx?f=${f.key}`}
          aria-current={f.key === current ? "page" : undefined}
          className="lfx-switch-item"
          scroll={false}
        >
          {f.label}
          {f.count > 0 && <span className="lfx-switch-count">{f.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
