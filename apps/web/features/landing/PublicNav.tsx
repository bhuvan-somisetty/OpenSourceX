import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="OpenSourceX home">
      <span className="logo-mark" aria-hidden="true" />
      OpenSourceX
    </Link>
  );
}

/** Minimal public navigation. The full app navigation only appears after sign-in. */
export function PublicNav() {
  return (
    <header className="l-nav">
      <div className="wrap in">
        <Logo />
        <nav className="links" aria-label="Site">
          <a href="/#product">Product</a>
          <a href="/#programs">Programs</a>
          <a href="/#how">How it works</a>
          <a href="/#trust">About</a>
        </nav>
        <span className="grow" style={{ flex: 1 }} />
        <Link className="btn sm" href="/login" data-testid="nav-signin">
          Sign in
        </Link>
      </div>
    </header>
  );
}
