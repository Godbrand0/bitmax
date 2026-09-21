"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion";
import { Button, CheckIcon, SectionHeading } from "@/components/ui";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pre-launch capture: BitMax's own contracts aren't on mainnet yet (see
 * fund-flow-reference.md's build-status table), so this collects interest
 * ahead of that rather than promising an immediate signup. No storage wired
 * up yet - submit is a stub that only flips local UI state.
 */
export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setStatus("error");
      return;
    }
    // TODO: wire to real storage once a backend is chosen.
    setStatus("done");
  }

  return (
    <section id="waitlist" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 text-center sm:px-12 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
            </div>

            <div className="relative">
              <SectionHeading
                eyebrow="Mainnet"
                title={
                  <>
                    Get in before{" "}
                    <span className="font-display italic text-gradient-brand">launch</span>
                  </>
                }
                description="BitMax is live on testnet today. Leave your email and we'll let you know the moment mainnet opens."
              />

              {status === "done" ? (
                <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium text-success">
                  <CheckIcon size={16} />
                  You&apos;re on the list - we&apos;ll be in touch.
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                  noValidate
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    className="w-full flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-muted/70 hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/25"
                  />
                  <Button type="submit" size="md" arrow>
                    Join waitlist
                  </Button>
                </form>
              )}

              {status === "error" && (
                <p className="mt-3 text-xs font-medium text-danger">
                  Enter a valid email address.
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
