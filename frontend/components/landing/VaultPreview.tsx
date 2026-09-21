"use client";

import { useEffect, useRef, useState } from "react";
import { BoostIcon } from "@/components/ui/Icons";

/**
 * The hero's illustrative vault card.
 *
 * The balance ticks upward continuously to convey "this accrues while you do
 * nothing" - the single most important idea in the product. These are sample
 * figures, not chain data, and the card says so; inventing a plausible-looking
 * live balance would be misleading.
 */

const START = 0.52_841_903;
const GROWTH_PER_TICK = 0.000_000_37;
const PRINCIPAL = 0.5;

export function VaultPreview() {
  const [balance, setBalance] = useState(START);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) return;

    // Only tick while visible - no work for a card scrolled off screen.
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      timer ??= setInterval(() => setBalance((b) => b + GROWTH_PER_TICK), 900);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  const earned = balance - PRINCIPAL;
  const [whole, decimals] = balance.toFixed(8).split(".");

  return (
    <div ref={ref} className="relative">
      {/* Gold bloom behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-brand/15 blur-3xl"
      />

      <div className="relative animate-float-slow rounded-3xl border border-border bg-surface p-6 shadow-xl sm:p-7">
        {/* Rising sats */}
        {!reduced && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            {[12, 34, 56, 78, 90].map((left, i) => (
              <span
                key={left}
                className="absolute bottom-10 h-1.5 w-1.5 rounded-full bg-brand/70"
                style={{
                  left: `${left}%`,
                  animation: `rise ${2.6 + i * 0.4}s var(--ease-out) ${i * 0.55}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Your balance
          </p>
          <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Illustrative
          </span>
        </div>

        <div className="relative mt-3 flex items-baseline gap-1.5">
          <span className="num text-4xl font-semibold tracking-tight text-foreground sm:text-[2.75rem]">
            {whole}.
            <span className="text-foreground">{decimals.slice(0, 4)}</span>
            <span className="text-muted">{decimals.slice(4)}</span>
          </span>
          <span className="text-sm font-semibold text-muted">BTC</span>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          growing every block
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              You put in
            </p>
            <p className="num mt-1 text-base font-semibold text-foreground">
              {PRINCIPAL.toFixed(8)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              You&apos;ve earned
            </p>
            <p className="num mt-1 text-base font-semibold text-success">
              +{earned.toFixed(8)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <BoostIcon size={15} />
          </span>
          <p className="text-xs font-medium text-brand-ink">
            Boost active - this balance is earning at a higher rate
          </p>
        </div>
      </div>
    </div>
  );
}
