import type { Metadata } from "next";
import { listTickets } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { first, type Params } from "@/lib/url";
import { canReport } from "@/lib/support";
import { DbDown } from "@/components/feedback/Notice";
import { ComplaintsList } from "@/features/support/ComplaintsList";
import { SignInToReport } from "@/features/support/SignInToReport";

export const metadata: Metadata = { title: "My complaints" };
export const dynamic = "force-dynamic";

/** The signed-in user's complaints, with status and withdraw. */
export default async function Complaints({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireSession();
  const sent = first((await searchParams).sent) === "1";
  const head = (
    <header className="support-head">
      <h1 className="page">My complaints</h1>
      <p className="sub">Everything you have reported, and where it stands.</p>
    </header>
  );
  if (!canReport(session))
    return (
      <>
        {head}
        <SignInToReport what="see your complaints" />
      </>
    );
  const res = await load((d) => listTickets(d, session.userId));
  return (
    <>
      {head}
      {res.ok ? <ComplaintsList tickets={res.data} justSent={sent} /> : <DbDown />}
    </>
  );
}
