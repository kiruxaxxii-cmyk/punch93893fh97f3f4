import { useEffect } from "react";

function getScrollRoot() {
  const main = document.querySelector(".app-shell__main");
  if (main && main.scrollHeight > main.clientHeight + 1) return main;
  return document.scrollingElement || document.documentElement;
}

function isEditable(target) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

function isNestedScrollable(target, root) {
  let el = target instanceof Element ? target : null;
  while (el && el !== root && el !== document.body && el !== document.documentElement) {
    if (el === document.querySelector(".app-shell__main") && root === el) break;
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight + 1) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Creamy inertia scrolling on the real page scroll root (window or main).
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Site motion is intentional (brand UX). Do not gate on prefers-reduced-motion.

    document.documentElement.classList.add("smooth-scroll-active");

    let root = getScrollRoot();
    let current = root.scrollTop || window.scrollY || 0;
    let target = current;
    let raf = 0;
    let running = true;
    let locked = false;
    const ease = 0.24;

    const read = () => (root === document.scrollingElement || root === document.documentElement
      ? window.scrollY || root.scrollTop || 0
      : root.scrollTop || 0);

    const maxScroll = () => {
      if (root === document.scrollingElement || root === document.documentElement) {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }
      return Math.max(0, root.scrollHeight - root.clientHeight);
    };

    const clamp = (v) => Math.min(Math.max(v, 0), maxScroll());

    const write = (y) => {
      if (root === document.scrollingElement || root === document.documentElement) {
        window.scrollTo(0, y);
      } else {
        root.scrollTop = y;
      }
    };

    const refreshRoot = () => {
      root = getScrollRoot();
      current = read();
      target = current;
    };

    const onWheel = (event) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      refreshRoot();
      if (isNestedScrollable(event.target, root)) return;
      event.preventDefault();
      locked = true;
      const scale = event.deltaMode === 1 ? 22 : event.deltaMode === 2 ? window.innerHeight * 0.8 : 0.92;
      target = clamp(target + event.deltaY * scale);
    };

    const onKey = (event) => {
      if (isEditable(event.target)) return;
      refreshRoot();
      const page = (root === document.documentElement || root === document.scrollingElement
        ? window.innerHeight
        : root.clientHeight) * 0.88;
      let delta = 0;
      if (event.key === "ArrowDown") delta = 56;
      else if (event.key === "ArrowUp") delta = -56;
      else if (event.key === "PageDown") delta = page;
      else if (event.key === "PageUp") delta = -page;
      else if (event.key === "Home") {
        event.preventDefault();
        locked = true;
        target = 0;
        return;
      } else if (event.key === "End") {
        event.preventDefault();
        locked = true;
        target = maxScroll();
        return;
      } else if (event.key === " ") delta = event.shiftKey ? -page : page;
      else return;
      event.preventDefault();
      locked = true;
      target = clamp(target + delta);
    };

    const tick = () => {
      if (!running) return;
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.2) {
        current = target;
        locked = false;
      }
      write(current);
      raf = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (locked) return;
      const y = read();
      if (Math.abs(y - current) > 1.5) {
        current = y;
        target = y;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("resize", refreshRoot);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const main = document.querySelector(".app-shell__main");
    if (main) main.addEventListener("scroll", onScroll, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", refreshRoot);
      window.removeEventListener("scroll", onScroll, true);
      if (main) main.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("smooth-scroll-active");
    };
  }, []);

  return null;
}
