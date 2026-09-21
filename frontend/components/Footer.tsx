import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { NETWORK_NAME } from "@/lib/network";
import { ExternalIcon } from "@/components/ui/Icons";

const COLUMNS: {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "Dashboard", href: "/app" },
      { label: "Boost", href: "/app/boost" },
      { label: "Borrow", href: "/app/borrow" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Where funds go", href: "/#fund-flows" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { label: "Stacks", href: "https://www.stacks.co", external: true },
      { label: "sBTC", href: "https://www.stacks.co/sbtc", external: true },
      { label: "StackingDAO", href: "https://www.stackingdao.com", external: true },
      { label: "Zest Protocol", href: "https://www.zestprotocol.com", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-background-alt">
      {/* Faint grid + gold bloom, echoing the hero so the page closes the way
          it opened. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={34} />
              <div>
                <span className="block text-lg font-bold leading-none tracking-tight text-foreground">
                  Bit<span className="text-brand">Max</span>
                </span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                  Maximize your Bitcoin
                </span>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              One yield on the Bitcoin you deposit, and locked STX to boost it higher. Earn Bitcoin
              Staking rewards on sBTC and borrow against your balance - all non-custodial, all on
              Stacks.
            </p>

            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-xs font-medium text-muted">
                Connected to{" "}
                <span className="font-semibold capitalize text-foreground">{NETWORK_NAME}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
                  {col.heading}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand"
                        >
                          {link.label}
                          <ExternalIcon
                            size={12}
                            className="opacity-0 transition-opacity duration-200 group-hover:opacity-70"
                          />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="group relative inline-block text-sm text-muted transition-colors hover:text-brand"
                        >
                          {link.label}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-brand transition-all duration-300 ease-out group-hover:w-full" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-muted">
            <span className="font-semibold text-foreground-soft">Risk notice.</span> BitMax is
            non-custodial software, not financial advice. Smart contracts carry inherent risk - only
            deposit what you can afford to have locked up while the contracts and protocols this app
            depends on mature. Locked STX cannot be withdrawn early, and borrowing against
            collateral can lead to liquidation.
          </p>
          <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} BitMax. Built on Stacks, secured by Bitcoin.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/docs#safety" className="text-xs text-muted hover:text-foreground">
                Safety &amp; custody
              </Link>
              <Link href="/docs#contracts" className="text-xs text-muted hover:text-foreground">
                Contracts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
