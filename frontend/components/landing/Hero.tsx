"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { Button, ShieldIcon, LockIcon, BitcoinIcon, ArrowDownIcon } from "@/components/ui";
import { VaultPreview } from "./VaultPreview";

const TRUST = [
  { icon: <ShieldIcon size={14} />, label: "Non-custodial" },
  { icon: <BitcoinIcon size={14} />, label: "Bitcoin-backed (sBTC)" },
  { icon: <LockIcon size={14} />, label: "Withdraw anytime" },
];

export function Hero() {
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
      // User closed the wallet prompt or it failed - stay put so they can
      // simply try again.
    }
  }

  const ctaLabel = wallet.connecting
    ? "Connecting"
    : wallet.address
      ? "Go to dashboard"
      : "Connect wallet to start";

  return (
    <section className="relative overflow-hidden">
      {/* Atmosphere: grid + two drifting gold/blue blooms. Purely decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.4] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-40 left-[15%] h-[32rem] w-[32rem] animate-drift rounded-full bg-brand/20 blur-[100px]" />
        <div
          className="absolute -top-20 right-[5%] h-[26rem] w-[26rem] animate-drift rounded-full bg-accent/10 blur-[100px]"
          style={{ animationDelay: "-8s" }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Copy */}
          <div className="animate-reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Built on Stacks · Secured by Bitcoin
            </span>

            <h1 className="mt-6 text-balance text-[2.6rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Maximize your Bitcoin,{" "}
              <span className="font-display font-normal italic text-gradient-brand">
                without handing it over.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">
              Deposit sBTC and earn Bitcoin Staking rewards automatically. Lock STX to boost that
              yield higher, and borrow against your balance whenever you want - all from one
              dashboard, all signed by your own wallet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={handleCta} loading={wallet.connecting} arrow>
                {ctaLabel}
              </Button>
              <Link href="#journey">
                <Button size="lg" variant="secondary" full>
                  See how it works
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {TRUST.map((item, i) => (
                <span
                  key={item.label}
                  className="inline-flex animate-reveal items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted backdrop-blur"
                  style={{ animationDelay: `${200 + i * 90}ms` }}
                >
                  <span className="text-brand">{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="animate-reveal [animation-delay:160ms] lg:pl-4">
            <VaultPreview />
          </div>
        </div>

        <a
          href="#journey"
          className="mx-auto mt-14 hidden w-fit flex-col items-center gap-2 text-muted transition-colors hover:text-brand sm:flex"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            The four steps
          </span>
          <ArrowDownIcon size={18} className="animate-float" />
        </a>
      </div>
    </section>
  );
}
