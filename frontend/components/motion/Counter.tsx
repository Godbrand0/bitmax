"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up to `value` once it scrolls into view.
 *
 * Money is the emotional centre of this product, so the headline figures
 * animate rather than just appearing. Kept string-formatted with a fixed
 * decimal count so the digits don't reflow width mid-animation (paired with
 * `.num` tabular numerals at the call site).
 */
export function Counter({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  duration = 1100,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    let raf = 0;
    let cancelled = false;

    const run = () => {
      const from = fromRef.current;
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / duration);
        // easeOutExpo - fast commit, soft landing.
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(from + (value - from) * eased);
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          fromRef.current = value;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
