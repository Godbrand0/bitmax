"use client";

import { useWallet } from "@/lib/wallet";
import { Button, ShieldIcon, WalletIcon } from "@/components/ui";

/**
 * Empty state for every product page before a wallet is connected. Reassures
 * as much as it prompts - connecting is the first trust decision a user makes.
 */
export function ConnectPrompt({ text }: { text: string }) {
  const wallet = useWallet();

  return (
    <div className="mx-auto my-8 flex max-w-md animate-pop-in flex-col items-center rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:my-16 sm:p-10">
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand/25"
        />
        <WalletIcon size={26} />
      </span>

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
        Connect your wallet
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">{text}</p>

      <Button
        className="mt-7"
        size="lg"
        onClick={wallet.connect}
        loading={wallet.connecting}
        arrow
      >
        {wallet.connecting ? "Connecting" : "Connect wallet"}
      </Button>

      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3.5 py-2 text-xs text-muted">
        <ShieldIcon size={13} className="shrink-0 text-success" />
        Non-custodial - you sign every action
      </p>
      <p className="mt-3 text-xs text-muted">Works with Leather and Xverse</p>
    </div>
  );
}
