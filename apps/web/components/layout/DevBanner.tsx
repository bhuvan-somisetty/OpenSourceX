import { dataMode } from "@/lib/data";
import type { Session } from "@/lib/auth";

/** Always visible in the app: this is a development or guest session on recorded data, never live data. */
export function DevBanner({ session }: { session: Session["kind"] }) {
  const m = dataMode();
  return (
    <aside
      className="devbar"
      role="status"
      aria-label="Development session and data status"
      data-testid="dev-banner"
    >
      <div className="wrap devbar-inner">
        <div className="devbar-badge">
          <span className="devbar-pulse" aria-hidden="true" />
          {session === "guest" ? <b>GUEST PREVIEW</b> : <b>DEVELOPMENT BUILD</b>}
        </div>
        <div className="devbar-text">
          <span>
            {session === "guest" ? "guest session, no real account" : "development session"}
          </span>
          <span className="devbar-sep" aria-hidden="true">
            ·
          </span>
          <span>
            data mode <code className="mono devbar-code">{m.mode.toUpperCase()}</code>
          </span>
          <span className="devbar-sep" aria-hidden="true">
            ·
          </span>
          <span>
            sanitized recorded snapshots, <b>not live data</b>. Live ingestion is disabled until
            source permissions are approved.
          </span>
        </div>
      </div>
    </aside>
  );
}
