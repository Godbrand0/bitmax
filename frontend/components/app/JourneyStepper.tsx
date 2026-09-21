"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoostIcon, BorrowIcon, DepositIcon } from "@/components/ui/Icons";

const STAGES = [
  { href: "/app", label: "Deposit & earn", short: "Earn", icon: <DepositIcon size={15} /> },
  { href: "/app/boost", label: "Boost", short: "Boost", icon: <BoostIcon size={15} /> },
  { href: "/app/borrow", label: "Borrow", short: "Borrow", icon: <BorrowIcon size={15} /> },
];

/**
 * Carries the landing page's four-act story into the product: wherever you
 * are, you can see the whole arc and which part you're in. Doubles as
 * navigation between the three product pages.
 */
export function JourneyStepper() {
  const pathname = usePathname();
  const currentIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.href === pathname)
  );

  return (
    <nav aria-label="Product journey" className="flex items-center gap-1.5 sm:gap-2">
      {STAGES.map((stage, i) => {
        const active = i === currentIndex;
        const done = i < currentIndex;
        return (
          <div key={stage.href} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && (
              <span
                aria-hidden
                className={`h-px w-4 transition-colors duration-500 sm:w-7 ${
                  done || active ? "bg-brand/50" : "bg-border"
                }`}
              />
            )}
            <Link
              href={stage.href}
              aria-current={active ? "step" : undefined}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 ease-out ${
                active
                  ? "border-brand bg-brand-soft text-brand-ink shadow-xs"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              <span className={active ? "text-brand" : ""}>{stage.icon}</span>
              <span className="text-xs font-semibold">
                <span className="hidden sm:inline">{stage.label}</span>
                <span className="sm:hidden">{stage.short}</span>
              </span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
