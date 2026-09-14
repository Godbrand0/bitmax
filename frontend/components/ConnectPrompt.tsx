"use client";

import { useWallet } from "@/lib/wallet";
import { Card } from "@/components/Card";

export function ConnectPrompt({ text }: { text: string }) {
  const wallet = useWallet();
  return (
    <Card title="Connect your wallet">
      <p className="mb-4 text-muted">{text}</p>
      <button
        onClick={wallet.connect}
        disabled={wallet.connecting}
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {wallet.connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    </Card>
  );
}
