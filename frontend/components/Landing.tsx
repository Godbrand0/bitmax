"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/Card";
import { useWallet } from "@/lib/wallet";

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function DepositIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function EarnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function BoostIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function BorrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10l-4 4 4 4" />
      <path d="M3 14h13a5 5 0 0 0 5-5" />
      <path d="M17 14l4-4-4-4" />
      <path d="M21 10H8a5 5 0 0 0-5 5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    icon: <DepositIcon />,
    title: "Bring in your Bitcoin",
    detail:
      "Send BTC from your own wallet. It becomes a Bitcoin-backed balance on Stacks - a real Bitcoin peg-in, confirmed on the Bitcoin network, not an IOU.",
  },
  {
    icon: <EarnIcon />,
    title: "Start earning",
    detail:
      "Put that balance to work and it starts earning Bitcoin Staking rewards automatically. No active management, no manual claiming.",
  },
  {
    icon: <BoostIcon />,
    title: "Boost your rewards",
    detail:
      "Lock STX for a while to pull a bigger share of the whole rewards pool toward you. This is the core of what BitMax does - not a side feature.",
  },
  {
    icon: <BorrowIcon />,
    title: "Borrow against it",
    detail:
      "Move your balance out whenever you want and borrow USDC against it on Zest, directly inside BitMax - no separate app, no giving up your rewards first.",
  },
];

const FAQ = [
  {
    q: "Is my Bitcoin safe?",
    a: "BitMax never takes custody of your Bitcoin beyond what you've deposited into the vault, and you can move your balance back out to your own wallet at any time. The underlying peg-in/peg-out is Bitcoin's own sBTC mechanism, not a BitMax-run bridge.",
  },
  {
    q: "Do I have to lock STX?",
    a: "No - depositing and earning the base rate works without locking anything. Locking STX is how you boost your share of the rewards pool, and it's the mechanism that makes BitMax different from just staking on your own, but it's your choice.",
  },
  {
    q: "What happens to my STX after I lock it?",
    a: "It stays locked for the duration you chose (2 weeks up to 2 years) and you get it back in full once the lock ends. The boost is a bonus on your Bitcoin rewards, not a fee taken from your STX.",
  },
  {
    q: "What can I borrow against my balance?",
    a: "USDC, borrowed directly from Zest Protocol's own lending market - BitMax calls Zest's real contract on your behalf, signed by your own wallet. Borrowing too much against too little collateral is rejected on-chain, the same as using Zest directly.",
  },
  {
    q: "What network does this run on?",
    a: "Stacks, secured by Bitcoin. The Zest borrow integration specifically only works once this app is live on Stacks mainnet.",
  },
];

export function Landing() {
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
      // user closed the wallet prompt or it failed - stay on the landing
      // page rather than navigate anywhere, so they can just try again.
    }
  }

  const ctaLabel = wallet.connecting
    ? "Connecting..."
    : wallet.address
      ? "Go to Dashboard"
      : "Connect Wallet to Start";

  return (
    <div className="flex flex-col gap-16 pb-8">
      {/* Hero */}
      <div className="text-center">
        <Badge>Built on Stacks · Secured by Bitcoin</Badge>
        <h1 className="mx-auto mt-4 max-w-lg text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Grow your Bitcoin, simply.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Deposit Bitcoin, earn real staking rewards automatically, boost your share by locking STX,
          and borrow against your growing balance - all from one dashboard, without giving up
          custody of your yield.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={handleCta}
            disabled={wallet.connecting}
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ctaLabel}
          </button>
          <a href="#how-it-works" className="text-xs font-medium text-muted hover:text-foreground">
            See how it works &darr;
          </a>
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
          {["Non-custodial", "Bitcoin-backed (sBTC)", "Withdraw anytime"].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted"
            >
              <ShieldIcon />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="scroll-mt-20">
        <h2 className="text-center text-xl font-bold text-foreground">How it works</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted">
          Four steps, each one optional past the first - move at your own pace.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <IconCircle>{step.icon}</IconCircle>
                <div>
                  <p className="text-xs font-semibold text-muted">STEP {i + 1}</p>
                  <p className="font-semibold text-foreground">{step.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why boosting matters */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <IconCircle>
            <BoostIcon />
          </IconCircle>
          <div>
            <h2 className="text-lg font-bold text-foreground">Boosting is what BitMax is about</h2>
            <p className="mt-2 text-sm text-muted">
              Everyone earns Bitcoin Staking rewards on their balance. Locking STX shifts a bigger
              share of the whole rewards pool toward you - the longer you lock, the bigger your
              share. It&apos;s a zero-sum redistribution: boosted depositors earn more than a flat,
              even split; depositors who don&apos;t lock earn a little less. This vote-escrow-style
              mechanism doesn&apos;t exist anywhere else on Stacks yet - it&apos;s the reason BitMax
              exists, not an add-on bolted onto a savings product.
            </p>
          </div>
        </div>
      </div>

      {/* Borrow section */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <IconCircle>
            <BorrowIcon />
          </IconCircle>
          <div>
            <h2 className="text-lg font-bold text-foreground">Borrow without leaving</h2>
            <p className="mt-2 text-sm text-muted">
              Once your balance is growing, move it to your own wallet whenever you want and borrow
              USDC against it on Zest Protocol - right inside BitMax. This talks directly to Zest's
              own lending contract, signed by your wallet; BitMax never holds or routes the funds
              itself.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-center text-xl font-bold text-foreground">Common questions</h2>
        <div className="mt-6 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-surface p-5 open:pb-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                {item.q}
                <span className="shrink-0 text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl bg-brand-soft p-6 text-center sm:p-8">
        <h2 className="text-lg font-bold text-foreground">Ready to put your Bitcoin to work?</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          {wallet.address
            ? "Your wallet is connected - head to your dashboard to get started."
            : "Connect a Stacks wallet (Leather or Xverse) to bring in Bitcoin and start earning."}
        </p>
        <button
          onClick={handleCta}
          disabled={wallet.connecting}
          className="mt-4 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ctaLabel}
        </button>
      </div>

      <p className="text-center text-xs text-muted">
        BitMax is non-custodial software, not financial advice. Smart contracts carry inherent risk
        - only deposit what you can afford to have locked up while contracts and protocols this app
        depends on mature.
      </p>
    </div>
  );
}
