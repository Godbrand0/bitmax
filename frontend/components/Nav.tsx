"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { WalletMenu } from "@/components/WalletMenu";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/boost", label: "Boost" },
  { href: "/app/borrow", label: "Borrow" },
  { href: "/docs", label: "Docs" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        B
      </span>
      <span className="text-base font-bold tracking-tight text-foreground">BitMax</span>
    </Link>
  );
}

export function Nav() {
  const wallet = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
        <Logo />

        <nav className="order-3 flex w-full gap-1 rounded-full border border-border bg-surface-muted p-1 sm:order-0 sm:w-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-colors sm:flex-none ${
                  active
                    ? "bg-brand text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {wallet.address ? (
          <WalletMenu />
        ) : (
          <button
            onClick={wallet.connect}
            disabled={wallet.connecting}
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {wallet.connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </header>
  );
}
