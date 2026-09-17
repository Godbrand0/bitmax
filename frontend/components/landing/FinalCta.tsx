"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui";

export function FinalCta() {
  const wallet = useWallet();
  const router = useRouter();

  async function handleCta() {
    if (wallet.address) {
      router.push("/app");
      return;
    }
    try {
      await wallet.connect();
      router.push("/app");
    } catch {
      // Wallet prompt dismissed - stay here so they can retry.
    }
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-brand/25 bg-brand-softer px-6 py-16 text-center sm:px-10 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
              <div className="absolute -bottom-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[90px]" />
            </div>

            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
                Ready to start{" "}
                <span className="font-display font-normal italic text-gradient-brand">
                  bitmaxxing?
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted">
                {wallet.address
                  ? "Your wallet is connected - head to your dashboard and start maximizing."
                  : "Connect a Stacks wallet (Leather or Xverse) to deposit sBTC, boost it, and maximize your Bitcoin."}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" onClick={handleCta} loading={wallet.connecting} arrow>
                  {wallet.connecting
                    ? "Connecting"
                    : wallet.address
                      ? "Go to dashboard"
                      : "Connect wallet to start"}
                </Button>
                <Link href="/docs">
                  <Button size="lg" variant="secondary">
                    Read the docs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
