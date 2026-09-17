"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { WalletMenu } from "@/components/WalletMenu";
import { Logo } from "@/components/Logo";
import { Button, CloseIcon, MenuIcon, WalletIcon } from "@/components/ui";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/boost", label: "Boost" },
  { href: "/app/borrow", label: "Borrow" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const wallet = useWallet();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sliding active-tab indicator: measured from the live DOM so it stays
  // correct across font loading and viewport changes, rather than assuming
  // fixed tab widths.
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>("[data-active='true']");
      if (!active) {
        setIndicator(null);
        return;
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    // Re-measure once webfonts settle, which changes tab widths.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ease-out ${
        scrolled
          ? "border-b border-border bg-surface/80 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        {/* Desktop tabs */}
        <nav
          ref={listRef}
          className="relative hidden items-center gap-1 rounded-full border border-border bg-surface-muted/70 p-1 md:flex"
        >
          {indicator && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full bg-surface shadow-sm transition-all duration-300 ease-spring"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
          {LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/app" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {wallet.address ? (
            <WalletMenu />
          ) : (
            <Button
              size="sm"
              onClick={wallet.connect}
              loading={wallet.connecting}
              icon={<WalletIcon size={15} />}
              className="hidden sm:inline-flex"
            >
              {wallet.connecting ? "Connecting" : "Connect"}
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-surface-muted md:hidden"
          >
            {menuOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`overflow-hidden border-t border-border bg-surface/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out md:hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {LINKS.map((link, i) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ transitionDelay: menuOpen ? `${i * 40}ms` : "0ms" }}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                } ${
                  active
                    ? "bg-brand-soft text-brand-ink"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {!wallet.address && (
            <Button
              full
              className="mt-2 sm:hidden"
              onClick={wallet.connect}
              loading={wallet.connecting}
              icon={<WalletIcon size={16} />}
            >
              {wallet.connecting ? "Connecting" : "Connect wallet"}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
