import { dataMode } from "@/lib/data";

/** Always visible: the build is running on recorded data, never live data. */
export function DevBanner() {
  const m = dataMode();
  return (
    <div className="devbar" role="status" data-testid="dev-banner">
      <div className="wrap">
        <b>DEVELOPMENT BUILD</b> · data mode <code className="mono">{m.mode.toUpperCase()}</code> ·
        showing sanitized recorded snapshots, <b>not live data</b>. Live ingestion is disabled until
        source permissions are approved.
      </div>
    </div>
  );
}
