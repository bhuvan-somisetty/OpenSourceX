import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedInterview } from "@opensourcex/database";
import { db } from "@/lib/data";
import type { InterviewProject, Level, Mode, Report } from "@/lib/interview/coach";
import { ReportView } from "@/features/interview/ReportView";
import type { SavedTurn } from "@/features/interview/history";

export const dynamic = "force-dynamic";
// a shared report is for the people given the link, not for search engines
export const metadata: Metadata = {
  title: "Shared interview report",
  robots: { index: false, follow: false },
};

/** A mock interview report its owner chose to share by link. Read-only. */
export default async function SharedInterview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await getSharedInterview(db(), token).catch(() => null);
  if (!s) notFound();
  const data = s.data as { project: InterviewProject; report: Report; turns: SavedTurn[] };
  return (
    <div className="wrap iv-wrap">
      <p className="ivr-shared-banner">
        A shared mock interview report from OpenSourceX, taken{" "}
        {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(s.at))}.{" "}
        <Link href="/interview">Practise your own interview →</Link>
      </p>
      <ReportView
        readOnly
        report={data.report}
        turns={data.turns}
        project={data.project}
        modes={s.modes as Mode[]}
        level={s.level as Level}
        engine={s.engine}
        note={null}
        plan={s.plan}
      />
    </div>
  );
}
