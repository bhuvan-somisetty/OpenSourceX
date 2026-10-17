import type { ReactNode } from "react";
import { PublicNav } from "@/features/landing/PublicNav";

/** Shared shell for the public legal pages (privacy, terms, security). */
export function LegalPage({
  eyebrow,
  title,
  updated,
  testId,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div className="auth" data-testid={testId}>
      <div className="atmos" aria-hidden="true" />
      <PublicNav />
      <article className="wrap legal" style={{ maxWidth: 760, padding: "48px 16px 80px" }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page" style={{ marginTop: 12 }}>
          {title}
        </h1>
        {updated && <p className="muted">Last updated {updated}</p>}
        {children}
      </article>
    </div>
  );
}
