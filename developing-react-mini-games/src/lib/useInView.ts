import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks whether an element is on screen. Used so the games only capture the
 * keyboard while the arcade cabinet is actually visible (no scroll hijacking).
 */
export function useInViewRef<T extends HTMLElement>(ref: RefObject<T | null>) {
  const visible = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        visible.current = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}
