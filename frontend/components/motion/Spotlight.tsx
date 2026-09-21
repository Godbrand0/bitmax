"use client";

import { useRef } from "react";

/**
 * Cursor-tracking glow for cards.
 *
 * Writes pointer position into CSS custom properties on the element and lets
 * a radial-gradient pseudo-layer do the painting, so the effect costs no
 * React re-renders. Pointer-driven only - disabled for coarse pointers,
 * where there's no cursor to follow.
 */
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  function handleMove(e: React.PointerEvent) {
    const node = ref.current;
    if (!node || e.pointerType !== "mouse") return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    node.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    node.style.setProperty("--spot-opacity", "1");
  }

  function handleLeave() {
    ref.current?.style.setProperty("--spot-opacity", "0");
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`group/spot relative isolate overflow-hidden ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[var(--spot-opacity,0)] transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklab, var(--brand) 13%, transparent), transparent 70%)",
        }}
      />
      {children}
    </Tag>
  );
}
