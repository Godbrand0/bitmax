"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal wrapper.
 *
 * Uses IntersectionObserver rather than CSS scroll-driven animations
 * (`animation-timeline: view()`), which still isn't available in every
 * browser we care about. Reveals once and then stops observing, so a long
 * page doesn't keep a live observer per section.
 *
 * Renders visible immediately when the user prefers reduced motion, or when
 * IntersectionObserver is unavailable, so content is never trapped hidden.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  y = 20,
  once = true,
}: {
  children: React.ReactNode;
  /** Stagger offset in ms. */
  delay?: number;
  as?: React.ElementType;
  className?: string;
  /** Travel distance in px. */
  y?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      // Fire a little before the element reaches the viewport edge so the
      // motion reads as "already in progress" rather than triggered.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      data-shown={shown || undefined}
      className={`reveal-init ${shown ? "reveal-shown" : ""} ${className}`}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          transform: shown ? undefined : `translate3d(0, ${y}px, 0)`,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
