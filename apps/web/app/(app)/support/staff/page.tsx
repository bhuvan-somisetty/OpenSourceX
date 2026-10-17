import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAllTickets, TICKET_STATUSES, type TicketStatus } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { first, type Params } from "@/lib/url";
import { isStaff, STATUS_LABELS } from "@/lib/support";
import { DbDown } from "@/components/feedback/Notice";
import { StaffList } from "@/features/support/StaffList";

export const metadata: Metadata = { title: "Help & support" };
export const dynamic = "force-dynamic";

/** Staff only (SUPPORT_ADMIN_IDS): every report, with status changes and replies. */
export default async function Staff({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireSession();
  if (!isStaff(session)) notFound();
  const raw = first((await searchParams).status);
  const status = (TICKET_STATUSES as readonly string[]).includes(raw)
    ? (raw as TicketStatus)
    : undefined;
  const res = await load((d) => listAllTickets(d, status));
  return (
    <>
      <header className="support-head">
        <h1 className="page">All reports</h1>
        <p className="sub">Only staff can see this page.</p>
      </header>
      <div className="support-filters" role="navigation" aria-label="Filter by status">
        <Link href="/support/staff" className={`chip${!status ? " active" : ""}`}>
          All
        </Link>
        {TICKET_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/support/staff?status=${s}`}
            className={`chip${status === s ? " active" : ""}`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>
      {res.ok ? <StaffList tickets={res.data} /> : <DbDown />}
    </>
  );
}
