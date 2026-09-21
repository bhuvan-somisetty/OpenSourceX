"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { INTRO_MOTION as M } from "./motion";

const DEST = "/product";

/**
 * Wraps the intro content and adds a rocket lift-off into the product landing.
 * The background animates on its own (CSS only); nothing is linked to the cursor.
 */
export function IntroStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    router.prefetch(DEST);
  }, [router]);

  /** Play a short exit, then route. Modified clicks keep the native link behavior. */
  const onClickCapture = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-cta]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(DEST);
    if (root.current?.classList.contains("leaving")) return;
    const btn = a as HTMLElement;
    btn.style.width = `${btn.getBoundingClientRect().width}px`; // lets the width animate down to a circle
    void btn.offsetWidth;
    root.current?.classList.add("leaving");
    btn.classList.add("go");
    window.setTimeout(() => router.push(DEST), M.leaveMs);
  };

  return (
    <main className="intro" data-testid="intro" ref={root} onClickCapture={onClickCapture}>
      {children}
    </main>
  );
}
