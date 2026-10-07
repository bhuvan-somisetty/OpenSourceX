import { dataMode } from "@/lib/data";
import type { Session } from "@/lib/auth";

/** Always visible in the app: this is a development or guest session on recorded data, never live data. */
export function DevBanner({ session }: { session: Session["kind"] }) {
  const m = dataMode();
  return (
    <div className="devbar" role="status" data-testid="dev-banner">
      <div className="wrap">
        {session === "guest" ? (
          <>
            <b>GUEST PREVIEW</b> · guest session, no real account
          </>
        ) : (
          <>
            <b>DEVELOPMENT BUILD</b> · development session
          </>
        )}{" "}
        · data mode <code className="mono">{m.mode.toUpperCase()}</code> · sanitized recorded
        snapshots, <b>not live data</b>. Live ingestion is disabled until source permissions are
        approved.
      </div>
    </div>
  );
}
