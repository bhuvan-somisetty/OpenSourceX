import Link from "next/link";

/** Shown to guests: reporting needs a real account so we can follow up. */
export function SignInToReport({ what }: { what: string }) {
  return (
    <section className="card support-gate" data-testid="support-sign-in">
      <h2>Sign in to {what}</h2>
      <p className="muted">
        Reports are linked to your account so you can track them, get updates and withdraw them.
        Guest sessions cannot report problems.
      </p>
      <Link href="/login" className="btn primary">
        Sign in with GitHub or Google
      </Link>
    </section>
  );
}
