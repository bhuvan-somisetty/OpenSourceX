import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { first, type Params } from "@/lib/url";
import { canReport } from "@/lib/support";
import { ReportForm } from "@/features/support/ReportForm";
import { SignInToReport } from "@/features/support/SignInToReport";

export const metadata: Metadata = { title: "Help & support" };
export const dynamic = "force-dynamic";

/** Report a problem. Signed-in accounts only. */
export default async function Support({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireSession();
  const from = first((await searchParams).from).slice(0, 500);
  return (
    <>
      <header className="support-head">
        <h1 className="page">Report a problem</h1>
        <p className="sub">
          Tell us what went wrong. Add a screenshot if it helps. We read every report.
        </p>
      </header>
      {canReport(session) ? (
        <ReportForm
          defaultPage={from.startsWith("https://") || from.startsWith("http://") ? from : ""}
        />
      ) : (
        <SignInToReport what="report a problem" />
      )}
    </>
  );
}
