"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/motion";
import { BoostIcon, CheckIcon, SectionHeading } from "@/components/ui";

/**
 * The "one yield, boosted higher" comparison.
 *
 * BitMax is a single yield on your Bitcoin that locking STX lifts - not two
 * products bolted together. The diagram carries that: the same base segment
 * on both sides, with the boost stacked on top of *your own* yield.
 *
 * Bars are deliberately unlabelled by percentage - the relationship is the
 * point, and quoting a yield figure here would invent a number we don't have.
 */
export function BoostExplainer() {
  const ref = useRef<HTMLDivElement>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setGrown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setGrown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const bar = "origin-bottom transition-transform duration-[900ms] ease-out";

  return (
    <section id="boost" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="How boosting works"
            title={
              <>
                One yield.{" "}
                <span className="font-display italic text-gradient-brand">Boost it higher.</span>
              </>
            }
            description="BitMax isn't two products stacked together. There's one yield on the Bitcoin you deposit - and locking STX raises the rate that yield pays you."
          />
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          {/* Diagram */}
          <Reveal>
            <div
              ref={ref}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
            >
              {/* Bars and labels are separate rows: keeping the labels out of
                  the fixed-height track stops the flex children from being
                  shrunk, which otherwise collapses the boost segment. */}
              <div className="flex items-end justify-center gap-10 sm:gap-16" style={{ height: 210 }}>
                {/* Deposit only */}
                <div className="flex h-full w-28 flex-col justify-end sm:w-36">
                  <div
                    className={`${bar} shrink-0 rounded-t-lg bg-muted/25 ring-1 ring-inset ring-border-strong`}
                    style={{
                      height: 120,
                      transform: grown ? "scaleY(1)" : "scaleY(0.04)",
                    }}
                  />
                </div>

                {/* Deposit + lock */}
                <div className="flex h-full w-28 flex-col justify-end sm:w-36">
                  <div
                    className={`${bar} relative shrink-0 overflow-hidden rounded-t-lg bg-brand`}
                    style={{
                      height: 76,
                      transitionDelay: "420ms",
                      transform: grown ? "scaleY(1)" : "scaleY(0.04)",
                    }}
                  >
                    <span aria-hidden className="absolute inset-0 animate-sheen bg-white/25" />
                  </div>
                  <div
                    className={`${bar} shrink-0 bg-muted/25 ring-1 ring-inset ring-border-strong`}
                    style={{
                      height: 120,
                      transform: grown ? "scaleY(1)" : "scaleY(0.04)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-10 sm:gap-16">
                <div className="w-28 text-center sm:w-36">
                  <p className="text-xs font-semibold text-foreground">Your yield</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted">sBTC deposited</p>
                </div>
                <div className="w-28 text-center sm:w-36">
                  <p className="text-xs font-semibold text-foreground">Your yield, boosted</p>
                  {/* Colour follows the legend: muted is the base, gold is the boost. */}
                  <p className="mt-1 text-[11px] leading-snug text-muted">
                    sBTC <span className="font-semibold text-brand-ink">+ locked STX</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-5">
                <span className="flex items-center gap-2 text-[11px] font-medium text-muted">
                  <span className="h-2.5 w-2.5 rounded-sm bg-muted/25 ring-1 ring-inset ring-border-strong" />
                  Your base yield
                </span>
                <span className="flex items-center gap-2 text-[11px] font-medium text-muted">
                  <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
                  Boost from locking STX
                </span>
              </div>
              <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted">
                Illustrative - proportions are not a yield forecast
              </p>
            </div>
          </Reveal>

          {/* Explanation */}
          <Reveal delay={120}>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
                <BoostIcon size={20} />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  Your rate goes up. Nobody else&apos;s goes down.
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Locking STX puts it to work in StackingDAO&apos;s Dual Stacking product. The extra
                  BTC that earns is paid straight onto your balance in sBTC each epoch, weighted by
                  how much and how long you locked - so it lifts your own yield rather than moving
                  anyone else&apos;s share around. Boosting is the reward for locking, funded by the
                  locked STX itself.
                </p>
              </div>
            </div>

            <ul className="mt-7 flex flex-col gap-3.5">
              {[
                "Your deposit earns the same base yield whether you lock or not - boosting only ever adds to it.",
                "Because the boost comes from your own locked STX working in Dual Stacking, it never lowers anyone else's rate.",
                "Your locked STX is returned in full when the lock ends - it's never taken as a fee.",
                "Lock from 2 weeks up to 6 months; the longer and larger the lock, the bigger the boost.",
              ].map((point, i) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm leading-relaxed text-foreground-soft"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <CheckIcon size={12} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
