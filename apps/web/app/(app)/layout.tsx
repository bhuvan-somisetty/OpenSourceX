import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DevBanner } from "@/components/layout/DevBanner";

export const dynamic = "force-dynamic";

/** The signed-in application shell. Every page in this group requires a session (development-only for now). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <>
      <DevBanner />
      <Header userName={session.name} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
