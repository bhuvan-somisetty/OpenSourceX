import type { ReactNode } from "react";

/** Public pages (landing, login) are always the cinematic dark theme. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="scope-dark" style={{ minHeight: "100vh" }}>
      <main id="main" style={{ minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
