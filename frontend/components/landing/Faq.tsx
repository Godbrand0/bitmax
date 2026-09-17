"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";

const FAQ = [
  {
    q: "Is my sBTC safe?",
    a: "BitMax never takes custody of your sBTC beyond what you've deposited into the vault, and you can move your balance back out to your own wallet at any time. BitMax doesn't handle the BTC-to-sBTC peg-in itself - that happens through sBTC's own official bridge before you ever touch BitMax.",
  },
  {
    q: "Do I have to lock STX?",
    a: "No. Depositing sBTC earns the base yield on its own, and not locking never costs you anything. Locking STX simply raises the rate your own deposit earns - because the boost is funded by your locked STX working in Dual Stacking, it adds to your yield rather than taking a share of anyone else's.",
  },
  {
    q: "What happens to my STX after I lock it?",
    a: "It stays locked for the duration you chose (2 weeks up to 6 months) and you get it back in full once the lock ends. Locks can't be ended early. While it's locked it earns the boost that lifts your balance, paid in sBTC - your STX itself is never taken as a fee.",
  },
  {
    q: "What can I borrow against my balance?",
    a: "USDCx, borrowed directly from Zest Protocol's own lending market against your stBTC as collateral. BitMax calls Zest's real contract on your behalf, signed by your own wallet. Borrowing too much against too little collateral is rejected on-chain, the same as using Zest directly.",
  },
  {
    q: "What network does this run on?",
    a: "Stacks, secured by Bitcoin. The Zest borrow integration specifically only works once this app is live on Stacks mainnet.",
  },
];

export function Faq() {
  // Single-open accordion: keeps the section short and makes the animation
  // read clearly rather than several panels sliding at once.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Questions"
            title={
              <>
                The things people{" "}
                <span className="font-display italic text-muted">actually ask</span>
              </>
            }
          />
        </Reveal>

        <div className="mt-12 flex flex-col gap-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 60}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                    isOpen
                      ? "border-brand/30 bg-surface shadow-sm"
                      : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                  >
                    <span className="text-[15px] font-semibold text-foreground">{item.q}</span>
                    <span
                      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-spring ${
                        isOpen ? "rotate-45 bg-brand text-white" : "bg-surface-muted text-muted"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                        <path
                          d="M6 1v10M1 6h10"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>

                  {/* 0fr → 1fr grid trick: animates to the content's natural
                      height without measuring it in JS. */}
                  <div
                    id={`faq-panel-${i}`}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6 sm:pb-6">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
