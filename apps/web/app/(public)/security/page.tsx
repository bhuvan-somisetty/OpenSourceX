import type { Metadata } from "next";
import { PublicNav } from "@/features/landing/PublicNav";
import { securityContact } from "@/lib/security-contact";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

/** How to report a vulnerability in OpenSourceX. */
export default function Security() {
  const contact = securityContact();
  return (
    <div className="auth" data-testid="security-page">
      <div className="atmos" aria-hidden="true" />
      <PublicNav />
      <div className="wrap" style={{ maxWidth: 760, padding: "48px 16px 80px" }}>
        <div className="eyebrow">Security</div>
        <h1 className="page" style={{ marginTop: 12 }}>
          Reporting a security problem
        </h1>
        <p className="sub">
          If you find a vulnerability in OpenSourceX, please tell us privately so it can be fixed
          before it is made public.
        </p>
        {contact ? (
          <p data-testid="security-contact">
            Email <a href={`mailto:${contact}`}>{contact}</a> with what you found, the steps to
            reproduce it, and the impact you expect. You will get a reply as soon as possible.
          </p>
        ) : (
          <p className="notice" data-testid="security-contact">
            A security contact address has not been published yet.
          </p>
        )}
        <h2 style={{ marginTop: 28 }}>Please</h2>
        <ul>
          <li>Do not open public issues or posts about a vulnerability before it is fixed.</li>
          <li>Do not access, change or delete other people&apos;s data while testing.</li>
          <li>Do not run denial-of-service, spam or social-engineering tests.</li>
          <li>Give a reasonable time to fix the problem before disclosing it.</li>
        </ul>
        <p className="muted" style={{ marginTop: 24 }}>
          Machine-readable contact details are at{" "}
          <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
        </p>
      </div>
    </div>
  );
}
