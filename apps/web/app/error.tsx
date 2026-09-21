"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="narrow" style={{ paddingTop: 64 }} data-testid="error-page">
      <div className="notice err" role="alert">
        <strong>Something went wrong loading this page.</strong>
        <p style={{ margin: "6px 0 0" }}>
          The rest of the app still works. Try again, or go back to a page that loaded.
        </p>
      </div>
      <div className="actions">
        <button className="btn primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="btn" href="/">
          Home
        </Link>
        <Link className="btn" href="/sources">
          Source status
        </Link>
      </div>
    </div>
  );
}
