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

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    icon: <DepositIcon />,
    title: "Deposit sBTC to start earning",
    detail:
      "Already hold sBTC? Deposit it into bitmax-vault and it's staked via StackingDAO immediately - no separate peg-in step inside BitMax, no active management, no manual claiming.",
  },
  {
    icon: <EarnIcon />,
    title: "Watch it grow",
    detail:
      "Your balance grows automatically as StackingDAO's Bitcoin Staking rewards accrue on the stBTC held for you - no claiming, no restaking, nothing to manage.",
  },
  {
    icon: <BoostIcon />,
    title: "Boost your rewards",
    detail:
      "Lock STX and it's pooled into StackingDAO's real Dual Stacking product, earning a genuinely additional BTC reward that's paid out to lockers - new yield, not a cut of anyone's base rate.",
  },
  {
    icon: <BorrowIcon />,
    title: "Borrow against it",
    detail:
      "Move your balance out whenever you want and supply that stBTC as collateral to borrow USDC on Zest Protocol's live market - directly inside BitMax, no separate app.",
  },
];

const FUND_FLOWS = [
  {
    icon: <DepositIcon />,
    title: "Your sBTC",
    path: ["sBTC deposit", "bitmax-vault", "staked via StackingDAO", "stBTC (redeemable anytime)"],
    detail:
      "Deposited sBTC is staked into StackingDAO's stBTC through bitmax-vault.clar, which tracks how much you put in versus how much you've earned. Redeem some or all of it back to a plain stBTC balance in your own wallet whenever you want - BitMax never locks this.",
  },
  {
    icon: <BoostIcon />,
    title: "Your locked STX",
    path: ["STX lock", "pooled into StackingDAO Dual Stacking", "BTC reward claimed each epoch", "paid to you in sBTC"],
    detail:
      "Locked STX doesn't sit idle - ve-stx-lock.clar pools every locker's STX into StackingDAO's real Dual Stacking product. bitmax-boost-distributor.clar claims the BTC-denominated reward that pool earns and pays it out in sBTC to lockers, split by locked weight. It's new yield the base rate never had, not a redistribution among depositors.",
  },
  {
    icon: <BorrowIcon />,
    title: "Your stBTC, borrowed against",
    path: ["stBTC", "supplied as collateral to Zest Protocol", "borrow USDC", "repay or withdraw anytime"],
    detail:
      "On the Borrow page, your stBTC is supplied directly to Zest Protocol's own live lending market (v0-8-market) as collateral. BitMax constructs the call but your wallet signs it - Zest's contract holds the collateral and enforces the borrow limit, not BitMax.",
  },
];

const FAQ = [
  {
    q: "Is my sBTC safe?",
    a: "BitMax never takes custody of your sBTC beyond what you've deposited into the vault, and you can move your balance back out to your own wallet at any time. BitMax doesn't handle the BTC-to-sBTC peg-in itself - that happens through sBTC's own official bridge before you ever touch BitMax.",
  },
  {
    q: "Do I have to lock STX?",
    a: "No - depositing and earning the base rate works without locking anything, and not locking never costs you anything either. The boost is a separate, additional BTC reward stream funded by pairing locked STX into real Dual Stacking - it's extra yield for lockers, not a share taken from everyone else's base rate.",
  },
  {
    q: "What happens to my STX after I lock it?",
    a: "It stays locked for the duration you chose (2 weeks up to 2 years) and you get it back in full once the lock ends. The boost pays out separately in sBTC - it's never a fee taken from your locked STX.",
  },
  {
    q: "What can I borrow against my balance?",
    a: "USDC, borrowed directly from Zest Protocol's own lending market against your stBTC as collateral - BitMax calls Zest's real contract on your behalf, signed by your own wallet. Borrowing too much against too little collateral is rejected on-chain, the same as using Zest directly.",
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
        <h1 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Put your Bitcoin to work, without handing it over.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted sm:text-base">
          Deposit sBTC and earn real Bitcoin Staking rewards automatically. Lock STX to unlock a
          second, genuinely additional BTC reward from real Dual Stacking. Borrow against your
          balance on Zest whenever you want - all non-custodial, all from one dashboard.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={handleCta}
            disabled={wallet.connecting}
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ctaLabel}
          </button>
          <a href="#fund-flows" className="text-xs font-medium text-muted hover:text-foreground">
            See exactly where your funds go &darr;
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

      {/* Where your funds go */}
      <div id="fund-flows" className="scroll-mt-20">
        <h2 className="text-center text-xl font-bold text-foreground">Where your funds actually go</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted">
          Nothing here is a black box - every step below is a specific contract call, signed by
          your own wallet. Here's exactly what happens to your sBTC, your locked STX, and any
          stBTC you borrow against.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {FUND_FLOWS.map((flow) => (
            <div key={flow.title} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <IconCircle>{flow.icon}</IconCircle>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{flow.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs font-medium text-muted">
                    {flow.path.map((step, i) => (
                      <span key={step} className="flex items-center gap-1.5">
                        {i > 0 && <ArrowIcon />}
                        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-foreground/90">
                          {step}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{flow.detail}</p>
            </div>
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
            <h2 className="text-lg font-bold text-foreground">Boosting is additive, not a redistribution</h2>
            <p className="mt-2 text-sm text-muted">
              Everyone earns the same Bitcoin Staking rewards on their balance, whether they lock
              STX or not. Locking STX pools it into StackingDAO's real Dual Stacking product, which
              pays a separate, genuinely additional BTC reward on top of ordinary STX stacking -
              BitMax claims that reward each epoch and pays it out in sBTC to lockers, weighted by
              how much and how long they locked. It's new yield that only exists because the STX
              was locked, so depositors who never lock are never worse off than depositing the same
              sBTC anywhere else. This vote-escrow-style mechanism, funded by a real yield source
              instead of skimmed from other depositors, doesn't exist anywhere else on Stacks yet.
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
              Once your balance is growing, move it to your own wallet whenever you want and supply
              that stBTC as collateral to borrow USDC on Zest Protocol's real lending market - right
              inside BitMax. This talks directly to Zest's own contract, signed by your wallet; Zest
              holds the collateral and enforces the borrow limit, and BitMax never holds or routes
              the funds itself.
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
            : "Connect a Stacks wallet (Leather or Xverse) to deposit sBTC and start earning."}
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
