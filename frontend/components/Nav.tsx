"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/boost", label: "Boost" },
  { href: "/borrow", label: "Borrow" },
];

export function Nav() {
  const wallet = useWallet();
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">BitMax</p>
          </div>
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-orange-500 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {wallet.address ? (
          <button
            onClick={wallet.disconnect}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {wallet.address.slice(0, 5)}...{wallet.address.slice(-4)}
          </button>
        ) : (
          <button
            onClick={wallet.connect}
            disabled={wallet.connecting}
            className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {wallet.connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
