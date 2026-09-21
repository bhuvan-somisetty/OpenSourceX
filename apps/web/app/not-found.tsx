import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow" style={{ paddingTop: 80 }} data-testid="not-found">
      <div className="eyebrow">404</div>
      <h1 className="page">We could not find that</h1>
      <p className="sub">
        It may not be in the recorded sample. The development build only holds a small set of
        recorded records.
      </p>
      <div className="actions">
        <Link className="btn primary" href="/discover">
          Browse projects
        </Link>
        <Link className="btn" href="/programs">
          Programs
        </Link>
      </div>
    </div>
  );
}
