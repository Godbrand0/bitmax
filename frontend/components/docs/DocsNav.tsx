"use client";

import { useEffect, useState } from "react";

/**
 * Sticky table of contents with scrollspy.
 *
 * Tracks which section is currently in the reading zone (the upper third of
 * the viewport) rather than merely intersecting, so the highlight follows
 * what you're actually reading on a page of unevenly-sized sections.
 */
export function DocsNav({ items }: { items: { href: string; label: string }[] }) {
  const [activeId, setActiveId] = useState(items[0]?.href.slice(1) ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section;
      }
      setActiveId(current.id);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  return (
    <nav aria-label="On this page" className="flex flex-col gap-1">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        On this page
      </p>
      {items.map((item) => {
        const active = activeId === item.href.slice(1);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "location" : undefined}
            className={`relative rounded-lg py-2 pl-4 pr-3 text-[13px] transition-all duration-200 ${
              active
                ? "bg-brand-softer font-semibold text-brand-ink"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-full bg-brand transition-all duration-300 ease-out ${
                active ? "h-5 opacity-100" : "h-0 opacity-0"
              }`}
            />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
