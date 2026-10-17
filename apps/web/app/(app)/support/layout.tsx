import type { ReactNode } from "react";
import { listTickets } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/data";
import { canReport, isStaff } from "@/lib/support";
import { SupportNav } from "@/features/support/SupportNav";

export const dynamic = "force-dynamic";

/** Help & support: report a problem, see your complaints, and (staff) handle all reports. */
export default async function SupportLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  let open: number | null = null;
  if (canReport(session)) {
    try {
      open = (await listTickets(db(), session.userId)).filter(
        (t) => t.status === "open" || t.status === "in_review",
      ).length;
    } catch {
      open = null;
    }
  }
  return (
    <div className="wrap support-layout">
      <aside className="support-side">
        <div className="eyebrow">Help &amp; support</div>
        <SupportNav openCount={open} staff={isStaff(session)} />
        <p className="hint support-side-note">
          For security problems you can also email the address on our{" "}
          <a href="/security">security page</a>.
        </p>
      </aside>
      <div className="support-main">{children}</div>
    </div>
  );
}
