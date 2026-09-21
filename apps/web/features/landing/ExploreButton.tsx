"use client";

/** Secondary CTA: opens the "How it works" sheet in the nav (single-screen landing, no scrolling sections). */
export function ExploreButton() {
  return (
    <button
      type="button"
      className="btn lg"
      data-testid="cta-explore"
      onClick={() =>
        document.querySelector<HTMLButtonElement>('[data-testid="nav-how"]')?.click() ??
        document.querySelector<HTMLButtonElement>('[data-testid="pub-menu-button"]')?.click()
      }
    >
      Explore open source
    </button>
  );
}
