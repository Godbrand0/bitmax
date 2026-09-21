"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { CheckIcon, CopyIcon, DisconnectIcon, WalletIcon } from "@/components/ui/Icons";

export function WalletMenu() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!wallet.address) return null;
  const address = wallet.address;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) - silently
      // no-op rather than throw; copying an address isn't critical enough to
      // surface an error banner over.
    }
  }

  function handleDisconnect() {
    setOpen(false);
    wallet.disconnect();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200 sm:text-[13px] ${
          open
            ? "border-brand bg-brand-soft text-brand-ink"
            : "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted"
        }`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        <span className="num">
          {address.slice(0, 5)}…{address.slice(-4)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right animate-pop-in overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border bg-surface-muted px-4 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              <WalletIcon size={11} />
              Connected wallet
            </p>
            <p className="num mt-1.5 break-all font-mono text-[11px] text-foreground-soft">
              {address}
            </p>
          </div>

          <button
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-surface-muted"
          >
            <span className={copied ? "text-success" : "text-muted"}>
              {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
            </span>
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            role="menuitem"
            onClick={handleDisconnect}
            className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
          >
            <DisconnectIcon size={15} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
