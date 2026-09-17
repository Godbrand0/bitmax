"use client";

import { Reveal, Spotlight } from "@/components/motion";
import {
  ArrowRightIcon,
  BoostIcon,
  BorrowIcon,
  DepositIcon,
  IconCircle,
  SectionHeading,
} from "@/components/ui";

const FLOWS = [
  {
    icon: <DepositIcon size={20} />,
    title: "Your sBTC",
    path: ["sBTC deposit", "bitmax-vault", "staked via StackingDAO", "stBTC"],
    detail:
      "Deposited sBTC is staked into StackingDAO's stBTC through bitmax-vault.clar, which tracks how much you put in versus how much you've earned. Redeem some or all of it back to a plain stBTC balance in your own wallet whenever you want - BitMax never locks this.",
  },
  {
    icon: <BoostIcon size={20} />,
    title: "Your locked STX",
    path: [
      "STX lock",
      "pooled into Dual Stacking",
      "extra BTC each epoch",
      "boosts your balance",
    ],
    detail:
      "Locked STX doesn't sit idle - ve-stx-lock.clar pools every locker's STX into StackingDAO's Dual Stacking product. bitmax-boost-distributor.clar claims the extra BTC that pool earns and pays it onto your balance in sBTC, weighted by how much and how long you locked. That's what raises your rate.",
  },
  {
    icon: <BorrowIcon size={20} />,
    title: "Your stBTC, borrowed against",
    path: ["stBTC", "supplied to Zest", "borrow USDCx", "repay anytime"],
    detail:
      "On the Borrow page, your stBTC is supplied directly to Zest Protocol's own live lending market (v0-8-market) as collateral. BitMax constructs the call but your wallet signs it - Zest's contract holds the collateral and enforces the borrow limit, not BitMax.",
  },
];

export function FundFlows() {
  return (
    <section id="fund-flows" className="scroll-mt-24 border-y border-border bg-background-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Full transparency"
            title={
              <>
                Where your funds{" "}
                <span className="font-display italic text-gradient-brand">actually go</span>
              </>
            }
            description="Nothing here is a black box. Every step below is a specific contract call, signed by your own wallet - here's exactly what happens to your sBTC, your locked STX, and any stBTC you borrow against."
          />
        </Reveal>

        <div className="mt-14 flex flex-col gap-5">
          {FLOWS.map((flow, i) => (
            <Reveal key={flow.title} delay={i * 90}>
              <Spotlight className="lift rounded-2xl border border-border bg-surface p-5 hover:border-brand/30 hover:lift-hover sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
                  <div className="flex items-start gap-4 lg:w-64 lg:shrink-0">
                    <IconCircle>{flow.icon}</IconCircle>
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {flow.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Step {i + 1} of 3
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Flow chain - arrows nudge forward on card hover. */}
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                      {flow.path.map((step, si) => (
                        <span key={step} className="flex items-center gap-1">
                          {si > 0 && (
                            <ArrowRightIcon
                              size={14}
                              className="shrink-0 text-brand/50 transition-transform duration-300 ease-out group-hover/spot:translate-x-0.5"
                            />
                          )}
                          <span
                            className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-foreground-soft transition-colors duration-300 group-hover/spot:border-brand/25"
                            style={{ transitionDelay: `${si * 60}ms` }}
                          >
                            {step}
                          </span>
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted">{flow.detail}</p>
                  </div>
                </div>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
