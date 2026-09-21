"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/motion";
import {
  BoostIcon,
  BorrowIcon,
  DepositIcon,
  EarnIcon,
  SectionHeading,
} from "@/components/ui";

const ACTS = [
  {
    icon: <DepositIcon size={18} />,
    kicker: "Deposit",
    title: "Put sBTC in, and it starts earning",
    detail:
      "Already hold sBTC? Deposit it into bitmax-vault and it's staked via StackingDAO immediately - no separate peg-in step inside BitMax, no active management, no manual claiming.",
    required: true,
  },
  {
    icon: <EarnIcon size={18} />,
    kicker: "Earn",
    title: "Watch it grow, block by block",
    detail:
      "Your balance grows automatically as StackingDAO's Bitcoin Staking rewards accrue on the stBTC held for you. Nothing to claim, nothing to restake, nothing to manage.",
    required: true,
  },
  {
    icon: <BoostIcon size={18} />,
    kicker: "Boost",
    title: "Lock STX to boost that yield",
    detail:
      "Lock STX and your deposit starts earning at a higher rate. Your STX goes to work in StackingDAO's Dual Stacking product, and the extra BTC it earns is paid straight onto your balance - lifting your yield without lowering anyone else's.",
    required: false,
  },
  {
    icon: <BorrowIcon size={18} />,
    kicker: "Borrow",
    title: "Unlock liquidity without selling",
    detail:
      "Move your balance out whenever you want and supply that stBTC as collateral to borrow USDCx on Zest Protocol's live market - directly inside BitMax, no separate app.",
    required: false,
  },
];

export function JourneyRail() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Fill the rail in proportion to how far the section has travelled through
  // the viewport, so the line "draws" itself as the story is read.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const anchor = window.innerHeight * 0.62;
      const travelled = anchor - rect.top;
      setProgress(Math.max(0, Math.min(1, travelled / rect.height)));
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
  }, []);

  return (
    <section id="journey" className="scroll-mt-24 pb-20 pt-10 sm:pb-28 sm:pt-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="The journey"
            title={
              <>
                Four steps.{" "}
                <span className="font-display italic text-muted">
                  Only the first is required.
                </span>
              </>
            }
            description="Each stage builds on the one before it, and you can stop at any of them. Deposit and earn, and you're done - boosting and borrowing are there when you want more."
          />
        </Reveal>

        <div ref={sectionRef} className="relative mt-16">
          {/* Rail */}
          <div
            aria-hidden
            className="absolute left-[19px] top-2 bottom-2 w-px bg-border sm:left-[27px]"
          >
            <div
              className="w-px bg-gradient-to-b from-brand via-brand to-brand/30 transition-[height] duration-300 ease-out"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <ol className="flex flex-col gap-10 sm:gap-14">
            {ACTS.map((act, i) => {
              // Light each node slightly before the rail reaches it.
              const active = progress >= (i + 0.35) / ACTS.length;
              return (
                <Reveal as="li" key={act.kicker} delay={i * 70} className="relative flex gap-5 sm:gap-7">
                  {/* Node */}
                  <div className="relative z-10 shrink-0">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-500 ease-out sm:h-14 sm:w-14 ${
                        active
                          ? "border-brand bg-brand text-white shadow-glow"
                          : "border-border bg-surface text-muted"
                      }`}
                    >
                      {act.icon}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 pt-1 sm:pt-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-[0.16em] transition-colors duration-500 ${
                          active ? "text-brand" : "text-muted"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")} - {act.kicker}
                      </span>
                      {!act.required && (
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Optional
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {act.title}
                    </h3>
                    <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted">
                      {act.detail}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
