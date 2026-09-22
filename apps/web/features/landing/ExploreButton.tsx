"use client";

/**
 * Secondary CTA: opens the "How it works" sheet in the nav (single-screen landing, no scrolling
 * sections). The desktop nav link is used directly when visible; the mobile Menu button is only a
 * fallback for narrow widths where that link is hidden. `Element.click()` returns `undefined`, so
 * this checks visibility explicitly instead of chaining with `??` (which never short-circuits).
 */
export function ExploreButton() {
  const onClick = () => {
    const navHow = document.querySelector<HTMLButtonElement>('[data-testid="nav-how"]');
    if (navHow && navHow.offsetParent !== null) {
      navHow.click();
      return;
    }
    document.querySelector<HTMLButtonElement>('[data-testid="pub-menu-button"]')?.click();
  };
  return (
    <button type="button" className="btn lg" data-testid="cta-explore" onClick={onClick}>
      Explore open source
    </button>
  );
}
