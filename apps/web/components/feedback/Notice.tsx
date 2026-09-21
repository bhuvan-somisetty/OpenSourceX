import type { ReactNode } from "react";

export function Notice({
  kind = "info",
  children,
  testId,
}: {
  kind?: "info" | "warn" | "err" | "dev";
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className={`notice ${kind}`} role={kind === "err" ? "alert" : "note"} data-testid={testId}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty" data-testid="empty-state">
      <h3>{title}</h3>
      <p className="muted" style={{ maxWidth: "52ch", margin: "8px auto 16px" }}>
        {children}
      </p>
      {action}
    </div>
  );
}

export function DbDown() {
  return (
    <Notice kind="err" testId="db-down">
      <strong>The database is not reachable.</strong> The app needs the local PostgreSQL container
      and recorded data. Run <code className="mono">pnpm dev</code> (it starts the database,
      migrates and seeds), then reload.
    </Notice>
  );
}
