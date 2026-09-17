"use client";

import { Reveal, Spotlight } from "@/components/motion";
import { BorrowIcon, Chip, SectionHeading } from "@/components/ui";
import { NETWORK_NAME } from "@/lib/network";

export function BorrowBand() {
  return (
    <section className="border-y border-border bg-background-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Liquidity"
              title={
                <>
                  Borrow{" "}
                  <span className="font-display italic text-gradient-brand">without leaving</span>
                </>
              }
              description="Once your balance is growing, move it to your own wallet whenever you want and supply that stBTC as collateral to borrow USDCx on Zest Protocol's real lending market - right inside BitMax."
            />
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">
              This talks directly to Zest&apos;s own contract, signed by your wallet. Zest holds the
              collateral and enforces the borrow limit; BitMax never holds or routes the funds
              itself.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip>Collateral: stBTC</Chip>
              <Chip>Borrow: USDCx</Chip>
              <Chip>Market: v0-8-market</Chip>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Spotlight className="lift rounded-2xl border border-border bg-surface p-6 shadow-sm hover:lift-hover sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <BorrowIcon size={20} />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Keep your position</p>
                  <p className="text-xs text-muted">Borrow against it instead of selling it</p>
                </div>
              </div>

              <ol className="mt-6 flex flex-col gap-4">
                {[
                  "Move part of your balance out to a plain stBTC balance in your wallet.",
                  "Supply that stBTC to Zest as collateral.",
                  "Borrow USDCx against it, and repay whenever you like.",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-[11px] font-bold text-muted">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground-soft">{step}</span>
                  </li>
                ))}
              </ol>

              {NETWORK_NAME !== "mainnet" && (
                <p className="mt-6 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
                  Zest runs on Stacks mainnet only. This app is currently pointed at{" "}
                  <span className="font-semibold capitalize">{NETWORK_NAME}</span>, so borrowing
                  unlocks once BitMax is live on mainnet.
                </p>
              )}
            </Spotlight>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
