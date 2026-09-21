"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { INTRO_MOTION as M } from "./motion";

const DEST = "/product";
const KEYS = ["x", "y", "bx", "by"] as const;

/**
 * Wraps the intro content. Adds cursor-reactive light (CSS variables, updated in one rAF loop with
 * smoothing), a small CTA magnet, and a short exit transition into the product landing.
 * With prefers-reduced-motion nothing follows the cursor and navigation is immediate.
 */
export function IntroStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    router.prefetch(DEST);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: 0, y: 0, bx: 0, by: 0 };
    const cur = { x: 0, y: 0, bx: 0, by: 0 };
    let raf = 0;

    const tick = () => {
      raf = 0;
      let moving = false;
      for (const k of KEYS) {
        const d = target[k] - cur[k];
        if (Math.abs(d) > 0.001) {
          cur[k] += d * M.follow;
          moving = true;
        }
      }
      el.style.setProperty("--mx", cur.x.toFixed(4));
      el.style.setProperty("--my", cur.y.toFixed(4));
      el.style.setProperty("--bx", `${(cur.bx * M.magnet).toFixed(2)}px`);
      el.style.setProperty("--by", `${(cur.by * M.magnet).toFixed(2)}px`);
      if (moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      const b = el.querySelector<HTMLElement>("[data-magnet]")?.getBoundingClientRect();
      if (b) {
        const dx = e.clientX - (b.left + b.width / 2);
        const dy = e.clientY - (b.top + b.height / 2);
        const near = Math.hypot(dx, dy) < M.magnetRange + b.width / 2;
        target.bx = near ? Math.max(-1, Math.min(1, dx / (b.width / 2))) : 0;
        target.by = near ? Math.max(-1, Math.min(1, dy / (b.height / 2))) : 0;
      }
      kick();
    };
    const leave = () => {
      target.x = target.y = target.bx = target.by = 0;
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
    const a = (e.target as HTMLElement).closest("a[data-magnet]");
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
