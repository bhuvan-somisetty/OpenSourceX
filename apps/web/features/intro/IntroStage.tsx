"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { INTRO_MOTION as M } from "./motion";

const DEST = "/product";

/**
 * Wraps the intro content. The cursor only moves the background light (CSS variables --mx/--my,
 * smoothed in one rAF loop); the logo, text and button never move. Adds a short exit transition
 * into the product landing. With prefers-reduced-motion nothing follows the cursor.
 */
export function IntroStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    router.prefetch(DEST);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;

    const tick = () => {
      raf = 0;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      cur.x += dx * M.follow;
      cur.y += dy * M.follow;
      el.style.setProperty("--mx", cur.x.toFixed(4));
      el.style.setProperty("--my", cur.y.toFixed(4));
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const leave = () => {
      target.x = target.y = 0;
      kick();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [router]);

  /** Play a short exit, then route. Modified clicks keep the native link behavior. */
  const onClickCapture = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-cta]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(DEST);
    root.current?.classList.add("leaving");
    window.setTimeout(() => router.push(DEST), M.leaveMs);
  };

  return (
    <main className="intro" data-testid="intro" ref={root} onClickCapture={onClickCapture}>
      {children}
    </main>
  );
}
