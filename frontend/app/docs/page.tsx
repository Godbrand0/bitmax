import Link from "next/link";
import { Badge, Card } from "@/components/Card";
import { CONTRACT_DEPLOYER, CONTRACTS, NETWORK_NAME } from "@/lib/network";

export const metadata = {
  title: "Docs · BitMax",
};

const DEVNET_PLACEHOLDER_DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const BITMAX_CONTRACTS_LIVE = CONTRACT_DEPLOYER !== DEVNET_PLACEHOLDER_DEPLOYER;

function explorerUrl(principal: string): string | null {
  if (NETWORK_NAME === "devnet") return null; // no public explorer for local devnet
  return `https://explorer.hiro.so/txid/${principal}?chain=${NETWORK_NAME}`;
}

type ContractRow = { name: string; principal: string; purpose: string };

function ContractTable({ rows, unavailableNote }: { rows: ContractRow[]; unavailableNote?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-medium">Contract</th>
            <th className="py-2 pr-4 font-medium">Purpose</th>
            <th className="py-2 font-medium">Explorer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const url = unavailableNote ? null : explorerUrl(row.principal);
            return (
              <tr key={row.principal} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 align-top">
                  <p className="font-mono text-xs font-medium text-foreground">{row.name}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-muted">{row.principal}</p>
                </td>
                <td className="py-3 pr-4 align-top text-muted">{row.purpose}</td>
                <td className="py-3 align-top">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand hover:underline"
                    >
                      View &rarr;
                    </a>
                  ) : (
                    <span className="text-muted">
                      {unavailableNote ?? "No public explorer on devnet"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const TOC = [
  { href: "#overview", label: "Overview" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#boosting", label: "Boosting, in depth" },
  { href: "#borrowing", label: "Borrowing on Zest" },
  { href: "#fees", label: "Fees & gas sponsorship" },
  { href: "#safety", label: "Safety & custody" },
  { href: "#contracts", label: "Contracts BitMax connects to" },
  { href: "#external", label: "External resources" },
];

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <Badge>Documentation</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Everything about BitMax
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            What BitMax does, how boosting and borrowing actually work under the hood, what it costs,
            and exactly which contracts your wallet talks to when you use it.
          </p>
        </div>

        <Card title="On this page">
          <nav className="flex flex-wrap gap-2">
            {TOC.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-brand hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </Card>

        <div className="mt-6 flex flex-col gap-6">
          <Card title="Overview">
            <p id="overview" className="scroll-mt-24 text-muted">
              BitMax is a Bitcoin-staking product on Stacks. You deposit sBTC (a 1:1 Bitcoin-backed
              SIP-010 token), it earns Bitcoin Staking rewards automatically via StackingDAO&apos;s
              stBTC, and you can lock STX to boost your share of those rewards. Once you hold stBTC,
              you can borrow USDC against it directly on Zest Protocol - without leaving BitMax and
              without giving up your position.
            </p>
            <p className="mt-3 text-muted">
              BitMax itself never takes custody of your funds beyond what you&apos;ve explicitly
              deposited, and every action - deposit, redeem, lock, borrow, repay - is signed by your
              own wallet. See{" "}
              <Link href="/app" className="font-medium text-brand hover:underline">
                the Dashboard
              </Link>{" "}
              to get started, or read on for the details.
            </p>
          </Card>

          <Card title="How it works">
            <div id="how-it-works" className="scroll-mt-24 flex flex-col gap-4 text-muted">
              <div>
                <p className="font-semibold text-foreground">1. Deposit sBTC</p>
                <p>
                  On the{" "}
                  <Link href="/app" className="font-medium text-brand hover:underline">
                    Dashboard
                  </Link>
                  , depositing sBTC into <code className="text-xs">bitmax-vault</code> stakes it via
                  StackingDAO and starts it earning immediately - the deposit itself is what starts
                  earning, there&apos;s no separate step.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">2. Watch it grow</p>
                <p>
                  Your balance accrues Bitcoin Staking rewards automatically. The Dashboard shows it
                  split into two numbers: how much you put in, and how much you&apos;ve earned on top.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">3. Boost (optional, but the whole point)</p>
                <p>
                  On the{" "}
                  <Link href="/app/boost" className="font-medium text-brand hover:underline">
                    Boost
                  </Link>{" "}
                  page, lock STX for 2 weeks up to 2 years to pull a bigger share of the total rewards
                  pool toward you. See{" "}
                  <a href="#boosting" className="font-medium text-brand hover:underline">
                    Boosting, in depth
                  </a>{" "}
                  below.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">4. Redeem</p>
                <p>
                  Move some or all of your balance back to a plain, freely-transferable stBTC balance
                  in your own wallet, whenever you want.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">5. Borrow (optional)</p>
                <p>
                  On the{" "}
                  <Link href="/app/borrow" className="font-medium text-brand hover:underline">
                    Borrow
                  </Link>{" "}
                  page, supply that redeemed stBTC to Zest Protocol as collateral and borrow USDC
                  against it, directly from BitMax. See{" "}
                  <a href="#borrowing" className="font-medium text-brand hover:underline">
                    Borrowing on Zest
                  </a>{" "}
                  below.
                </p>
              </div>
            </div>
          </Card>

          <Card title="Boosting, in depth">
            <div id="boosting" className="scroll-mt-24 flex flex-col gap-3 text-muted">
              <p>
                Everyone who deposits earns Bitcoin Staking rewards at the same base rate. Locking STX
                in <code className="text-xs">ve-stx-lock</code> doesn&apos;t create extra yield out of
                nowhere - it redistributes the vault&apos;s real, already-earned rewards. Each epoch,{" "}
                <code className="text-xs">bitmax-boost-distributor</code> totals the vault&apos;s
                actual stBTC yield and splits it so that depositors with a bigger locked-STX weight
                (relative to everyone else&apos;s) get more than a flat, even split, and depositors
                who haven&apos;t locked anything get correspondingly less.
              </p>
              <p>
                Weight decays linearly toward your unlock height (a Curve-style vote-escrow curve):
                locking more STX, or locking for longer, both increase your weight. You get the STX
                back in full once your chosen lock duration ends - the boost is a redistribution of
                yield, never a fee taken from your locked STX itself.
              </p>
              <p>
                This mechanism doesn&apos;t exist anywhere else on Stacks yet - it&apos;s the reason
                BitMax exists as its own product, not a feature bolted onto a plain savings vault.
              </p>
            </div>
          </Card>

          <Card title="Borrowing on Zest">
            <div id="borrowing" className="scroll-mt-24 flex flex-col gap-3 text-muted">
              <p>
                The Borrow page talks directly to Zest Protocol&apos;s own live lending market (
                <code className="text-xs">v0-8-market</code>) - BitMax constructs the call, but your
                wallet signs it and Zest&apos;s contract executes it. BitMax never holds or routes
                the stBTC or USDC involved.
              </p>
              <p>
                <strong className="text-foreground">Supply</strong> your stBTC as collateral,{" "}
                <strong className="text-foreground">borrow</strong> USDC against it (Zest enforces the
                real collateral limit on-chain and rejects an unsafe borrow),{" "}
                <strong className="text-foreground">repay</strong> whenever you want - repaying more
                than you owe is safe, Zest only ever pulls exactly what&apos;s outstanding - and{" "}
                <strong className="text-foreground">withdraw</strong> your stBTC back to your own
                wallet at any time. Zest&apos;s own health check blocks a withdrawal that would leave
                an active loan undercollateralized, so a full exit means repaying first.
              </p>
              <p>
                The &quot;estimated available to borrow&quot; figure shown is exactly that - an
                estimate, built from a public BTC price and a conservative assumed collateral ratio,
                since Zest&apos;s own contract doesn&apos;t expose an exact read for this. Treat it as
                a guide for what to type, not a guarantee.
              </p>
              <p>
                Zest only runs on Stacks mainnet - the Borrow page explains this plainly if this
                deployment is pointed at a different network.
              </p>
            </div>
          </Card>

          <Card title="Fees & gas sponsorship">
            <div id="fees" className="scroll-mt-24 flex flex-col gap-3 text-muted">
              <p>
                Every transaction in BitMax - deposit, redeem, lock, unlock, boost registration, and
                all three Zest actions - is <strong className="text-foreground">gas-sponsored</strong>.
                You never need STX in your wallet just to pay a transaction fee: your wallet signs the
                action, and BitMax&apos;s own sponsor account covers the network fee.
              </p>
              <p>
                BitMax itself charges no fee on top of that. Any yield redistribution from boosting is
                zero-sum among depositors (see{" "}
                <a href="#boosting" className="font-medium text-brand hover:underline">
                  Boosting
                </a>
                ), and Zest&apos;s own interest rates and liquidation terms apply exactly as they
                would using Zest directly.
              </p>
            </div>
          </Card>

          <Card title="Safety & custody">
            <div id="safety" className="scroll-mt-24 flex flex-col gap-3 text-muted">
              <p>
                BitMax is non-custodial: it never holds a key that can move your funds without your
                own wallet signing the transaction. Deposited sBTC is staked via StackingDAO and can
                be redeemed back to a plain wallet balance at any time via{" "}
                <code className="text-xs">bitmax-vault</code>&apos;s <code className="text-xs">redeem</code>{" "}
                function.
              </p>
              <p>
                Smart contracts carry inherent risk. BitMax&apos;s own contracts are unaudited at this
                stage, and this is not financial advice - only deposit what you&apos;re comfortable
                having exposed to smart-contract risk while this project and the protocols it depends
                on (sBTC, StackingDAO&apos;s stBTC, Zest) mature.
              </p>
            </div>
          </Card>

          <Card title="Contracts BitMax connects to">
            <div id="contracts" className="scroll-mt-24 flex flex-col gap-6">
              <p className="text-muted">
                Every contract your wallet is ever asked to sign a transaction for, or that this app
                reads balances from. Nothing here is guessed - every address below was confirmed
                directly against each protocol&apos;s own published source before being used.
              </p>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  BitMax&apos;s own contracts
                </h3>
                {!BITMAX_CONTRACTS_LIVE && (
                  <p className="mb-2 text-xs text-muted">
                    This deployment hasn&apos;t set a real contract deployer yet (
                    <code>NEXT_PUBLIC_CONTRACT_DEPLOYER</code> is unset) - the addresses below are
                    Clarinet&apos;s devnet placeholder, not a real deployment.
                  </p>
                )}
                <ContractTable
                  rows={[
                    {
                      name: CONTRACTS.vault,
                      principal: `${CONTRACT_DEPLOYER}.${CONTRACTS.vault}`,
                      purpose: "Holds deposits, tracks principal vs. yield, handles redeem.",
                    },
                    {
                      name: CONTRACTS.veLock,
                      principal: `${CONTRACT_DEPLOYER}.${CONTRACTS.veLock}`,
                      purpose: "Locks STX, computes your decaying boost weight.",
                    },
                    {
                      name: CONTRACTS.distributor,
                      principal: `${CONTRACT_DEPLOYER}.${CONTRACTS.distributor}`,
                      purpose: "Each epoch, redistributes real yield weighted by boost.",
                    },
                  ]}
                  unavailableNote={BITMAX_CONTRACTS_LIVE ? undefined : "Not a real deployment"}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">sBTC (Stacks Foundation)</h3>
                <ContractTable
                  rows={[
                    {
                      name: "sbtc-token",
                      principal: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
                      purpose: "The SIP-010 sBTC token - what you deposit into BitMax.",
                    },
                    {
                      name: "sbtc-withdrawal",
                      principal: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal",
                      purpose: "Initiates an sBTC → native BTC withdrawal.",
                    },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">StackingDAO</h3>
                <ContractTable
                  rows={[
                    {
                      name: "stbtc-token",
                      principal: "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token",
                      purpose: "The SIP-010 stBTC token - what your deposit earns.",
                    },
                    {
                      name: "stacking-dao-core-stbtc-v1",
                      principal: "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1",
                      purpose: "StackingDAO's own deposit/withdraw entrypoint for stBTC.",
                    },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Zest Protocol</h3>
                <ContractTable
                  rows={[
                    {
                      name: "v0-8-market",
                      principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-8-market",
                      purpose: "Supply collateral, borrow, and repay - the Borrow page's core contract.",
                    },
                    {
                      name: "v0-market-vault",
                      principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-market-vault",
                      purpose: "Read-only: your real supplied collateral and loan status.",
                    },
                    {
                      name: "v0-assets",
                      principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-assets",
                      purpose: "Registry BitMax uses to resolve stBTC/USDC contract addresses live.",
                    },
                  ]}
                />
              </div>

              <p className="text-xs text-muted">
                <code className="text-xs">bitmax-vault</code>&apos;s own staking calls currently target
                a mock StackingDAO stand-in on devnet/testnet, not the real{" "}
                <code className="text-xs">stacking-dao-core-stbtc-v1</code> contract above - the
                Borrow page&apos;s stBTC balance display does read the real token contract, but the
                vault&apos;s deposit flow hasn&apos;t been switched over yet.
              </p>
            </div>
          </Card>

          <Card title="External resources">
            <div id="external" className="scroll-mt-24 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="https://www.zestprotocol.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border p-4 hover:border-brand"
              >
                <p className="font-semibold text-foreground">Zest Protocol</p>
                <p className="mt-1 text-sm text-muted">Where BitMax&apos;s Borrow page gets its data and sends its calls.</p>
              </a>
              <a
                href="https://docs.zestprotocol.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border p-4 hover:border-brand"
              >
                <p className="font-semibold text-foreground">Zest Protocol docs</p>
                <p className="mt-1 text-sm text-muted">Zest&apos;s own documentation for its lending market.</p>
              </a>
              <a
                href="https://www.stackingdao.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border p-4 hover:border-brand"
              >
                <p className="font-semibold text-foreground">StackingDAO</p>
                <p className="mt-1 text-sm text-muted">Issues stBTC and runs the Bitcoin Staking behind it.</p>
              </a>
              <a
                href="https://docs.stacks.co/more-guides/sbtc"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border p-4 hover:border-brand"
              >
                <p className="font-semibold text-foreground">sBTC documentation</p>
                <p className="mt-1 text-sm text-muted">How the BTC ↔ sBTC peg itself works.</p>
              </a>
              <a
                href="https://explorer.hiro.so"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border p-4 hover:border-brand sm:col-span-2"
              >
                <p className="font-semibold text-foreground">Stacks Explorer</p>
                <p className="mt-1 text-sm text-muted">Look up any contract or transaction on Stacks directly.</p>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
