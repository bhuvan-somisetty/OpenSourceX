"use client";

import { useEffect } from "react";

/**
 * Home page motion: sections marked `data-reveal` fade up as they scroll into view, and numbers
 * marked `data-count` count up from zero. Without JavaScript, or with reduced motion, everything
 * simply shows in place.
 */
export function HomeEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector(".home");
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    sections.forEach((el) => el.classList.add("reveal-pending"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("revealed");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    sections.forEach((el) => io.observe(el));

    const frames: number[] = [];
    root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const target = Number(el.dataset.count);
      const final = el.textContent ?? "";
      if (!Number.isFinite(target) || target <= 0) return;
      const start = performance.now();
      const duration = 3200;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = t < 1 ? String(Math.round(target * eased)) : final;
        if (t < 1) frames.push(requestAnimationFrame(tick));
      };
      el.textContent = "0";
      frames.push(requestAnimationFrame(tick));
    });

    return () => {
      io.disconnect();
      frames.forEach(cancelAnimationFrame);
      sections.forEach((el) => el.classList.remove("reveal-pending", "revealed"));
    };
  }, []);

  return null;
}
