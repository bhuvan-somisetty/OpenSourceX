import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { DevBanner } from "@/components/layout/DevBanner";

export const dynamic = "force-dynamic";

/** The signed-in application shell. Every page needs a session: a GitHub/Google account, a guest, or (locally) development. The development banner shows only for local development sessions. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <div className="app-shell">
      <div className="app-atmos" aria-hidden="true" />
      {session.kind === "development" && <DevBanner session={session.kind} />}
      <Header userName={session.name} kind={session.kind} />
      <main id="main">{children}</main>
    </div>
  );
}
