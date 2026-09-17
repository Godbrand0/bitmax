import Link from "next/link";
import { Badge, Chip, ExternalIcon } from "@/components/ui";
import { CONTRACT_DEPLOYER, CONTRACTS, NETWORK_NAME } from "@/lib/network";
import { DocsNav } from "@/components/docs/DocsNav";
import { DocSection } from "@/components/docs/DocSection";

export const metadata = {
  title: "Docs",
  description:
    "How BitMax maximizes your Bitcoin: how boosting and borrowing work under the hood, what it costs, and exactly which contracts your wallet talks to.",
};

const DEVNET_PLACEHOLDER_DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const BITMAX_CONTRACTS_LIVE = CONTRACT_DEPLOYER !== DEVNET_PLACEHOLDER_DEPLOYER;

function explorerUrl(principal: string): string | null {
  if (NETWORK_NAME === "devnet") return null; // no public explorer for local devnet
  return `https://explorer.hiro.so/txid/${principal}?chain=${NETWORK_NAME}`;
}

type ContractRow = { name: string; principal: string; purpose: string };

function ContractTable({
  rows,
  unavailableNote,
}: {
  rows: ContractRow[];
  unavailableNote?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-wider text-muted">
            <th className="px-4 py-2.5 font-semibold">Contract</th>
            <th className="px-4 py-2.5 font-semibold">Purpose</th>
            <th className="px-4 py-2.5 font-semibold">Explorer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const url = unavailableNote ? null : explorerUrl(row.principal);
            return (
              <tr
                key={row.principal}
                className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/60"
              >
                <td className="px-4 py-3.5 align-top">
                  <p className="font-mono text-xs font-semibold text-foreground">{row.name}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-muted">{row.principal}</p>
                </td>
                <td className="px-4 py-3.5 align-top text-muted">{row.purpose}</td>
                <td className="px-4 py-3.5 align-top">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                    >
                      View
                      <ExternalIcon size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-muted">
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
  { href: "#contracts", label: "Contracts" },
  { href: "#external", label: "External resources" },
];

const STEPS = [
  {
    title: "Deposit sBTC",
    body: (
      <>
        On the{" "}
        <Link href="/app" className="font-medium text-brand hover:underline">
          Dashboard
        </Link>
        , depositing sBTC into <code>bitmax-vault</code> stakes it via StackingDAO and starts it
        earning immediately - the deposit itself is what starts earning, there&apos;s no separate
        step.
      </>
    ),
  },
  {
    title: "Watch it grow",
    body: (
      <>
        Your balance accrues Bitcoin Staking rewards automatically. The Dashboard shows it split
        into two numbers: how much you put in, and how much you&apos;ve earned on top.
      </>
    ),
  },
  {
    title: "Boost (optional, but the whole point)",
    body: (
      <>
        On the{" "}
        <Link href="/app/boost" className="font-medium text-brand hover:underline">
          Boost
        </Link>{" "}
        page, lock STX for 2 weeks up to 6 months to raise the rate your deposit earns. See{" "}
        <a href="#boosting">Boosting, in depth</a> below.
      </>
    ),
  },
  {
    title: "Redeem",
    body: (
      <>
        Move some or all of your balance back to a plain, freely-transferable stBTC balance in your
        own wallet, whenever you want.
      </>
    ),
  },
  {
    title: "Borrow (optional)",
    body: (
      <>
        On the{" "}
        <Link href="/app/borrow" className="font-medium text-brand hover:underline">
          Borrow
        </Link>{" "}
        page, supply that redeemed stBTC to Zest Protocol as collateral and borrow USDCx against it,
        directly from BitMax. See <a href="#borrowing">Borrowing on Zest</a> below.
      </>
    ),
  },
];

const RESOURCES = [
  {
    href: "https://www.zestprotocol.com",
    title: "Zest Protocol",
    body: "Where BitMax's Borrow page gets its data and sends its calls.",
  },
  {
    href: "https://docs.zestprotocol.com",
    title: "Zest Protocol docs",
    body: "Zest's own documentation for its lending market.",
  },
  {
    href: "https://www.stackingdao.com",
    title: "StackingDAO",
    body: "Issues stBTC and runs the Bitcoin Staking behind it.",
  },
  {
    href: "https://docs.stacks.co/more-guides/sbtc",
    title: "sBTC documentation",
    body: "How the BTC ↔ sBTC peg itself works.",
  },
  {
    href: "https://explorer.hiro.so",
    title: "Stacks Explorer",
    body: "Look up any contract or transaction on Stacks directly.",
  },
];

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header band */}
      <div className="relative overflow-hidden border-b border-border bg-background-alt">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_100%_at_30%_0%,black,transparent)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Badge>Documentation</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything about BitMax
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            What BitMax does, how boosting and borrowing actually work under the hood, what it
            costs, and exactly which contracts your wallet talks to when you use it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip>Network: {NETWORK_NAME}</Chip>
            <Chip>Non-custodial</Chip>
            <Chip>Gas-sponsored</Chip>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <DocsNav items={TOC} />
          </aside>

          {/* Content */}
          <div className="flex min-w-0 max-w-3xl flex-col gap-14">
            <DocSection
              id="overview"
              title="Overview"
              lead="BitMax is a Bitcoin-staking product on Stacks - one yield on your Bitcoin, which locked STX boosts higher."
            >
              <p>
                You deposit sBTC (a 1:1 Bitcoin-backed SIP-010 token), it earns Bitcoin Staking
                rewards automatically via StackingDAO&apos;s stBTC, and you can lock STX to raise
                the rate that deposit earns. Once you hold stBTC, you can borrow USDCx against it
                directly on Zest Protocol - without leaving BitMax and without giving up your
                position.
              </p>
              <p>
                BitMax itself never takes custody of your funds beyond what you&apos;ve explicitly
                deposited, and every action - deposit, redeem, lock, borrow, repay - is signed by
                your own wallet. See{" "}
                <Link href="/app" className="font-medium text-brand hover:underline">
                  the Dashboard
                </Link>{" "}
                to get started, or read on for the details.
              </p>
            </DocSection>

            <DocSection id="how-it-works" title="How it works">
              <ol className="flex flex-col gap-5">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </DocSection>

            <DocSection
              id="boosting"
              title="Boosting, in depth"
              lead="Locking STX raises your own rate - it doesn't move yield between users."
            >
              <p>
                Everyone who deposits earns Bitcoin Staking rewards at the same base rate. Locking
                STX in <code>ve-stx-lock</code> doesn&apos;t touch that base rate - it adds to it.
                Every locker&apos;s STX is pooled and paired into StackingDAO&apos;s Dual Stacking
                product, and each epoch <code>bitmax-boost-distributor</code> claims the extra
                BTC-denominated reward that pool earns and pays it out in sBTC to lockers, split
                purely by locked-STX weight. The effect is a higher rate on your own deposit, funded
                by the STX you locked - not a cut of anyone else&apos;s base deposit yield.
              </p>
              <p>
                Weight decays linearly toward your unlock height (a Curve-style vote-escrow curve):
                locking more STX, or locking for longer, both increase your weight and therefore the
                size of your boost. You get the STX back in full - the boost is paid onto your
                balance in sBTC, never as a fee taken from your locked STX itself.
              </p>
              <p>
                Getting it back is two real steps, not one, mirroring StackingDAO&apos;s own real
                withdrawal mechanics: once your chosen lock duration ends, <strong>starting the
                unlock</strong> clears the lock and begins a further, separate withdrawal cooldown
                (currently ~2 weeks on the real protocol) - only once that has also passed can you{" "}
                <strong>claim</strong> the STX into your wallet. That second cooldown is additive,
                not included in the lock duration you originally chose.
              </p>
              <p>
                Because the boost is funded by the locked STX itself rather than skimmed from the
                base rate, depositors who never lock are never worse off than depositing the same
                sBTC elsewhere - locking only ever raises the locker&apos;s own rate, and is never a
                tax on staying unboosted.
              </p>
            </DocSection>

            <DocSection id="borrowing" title="Borrowing on Zest">
              <p>
                The Borrow page talks directly to Zest Protocol&apos;s own live lending market (
                <code>v0-8-market</code>) - BitMax constructs the call, but your wallet signs it and
                Zest&apos;s contract executes it. BitMax never holds or routes the stBTC or USDCx
                involved.
              </p>
              <p>
                <strong>Supply</strong> your stBTC as collateral, <strong>borrow</strong> USDCx
                against it (Zest enforces the real collateral limit on-chain and rejects an unsafe
                borrow), <strong>repay</strong> whenever you want - repaying more than you owe is
                safe, Zest only ever pulls exactly what&apos;s outstanding - and{" "}
                <strong>withdraw</strong> your stBTC back to your own wallet at any time.
                Zest&apos;s own health check blocks a withdrawal that would leave an active loan
                undercollateralized, so a full exit means repaying first.
              </p>
              <p>
                The &quot;estimated available to borrow&quot; figure shown is exactly that - an
                estimate, built from a public BTC price and a conservative assumed collateral ratio,
                since Zest&apos;s own contract doesn&apos;t expose an exact read for this. Treat it
                as a guide for what to type, not a guarantee.
              </p>
              <p>
                Zest only runs on Stacks mainnet - the Borrow page explains this plainly if this
                deployment is pointed at a different network.
              </p>
            </DocSection>

            <DocSection id="fees" title="Fees & gas sponsorship">
              <p>
                Every transaction in BitMax - deposit, redeem, lock, unlock, boost registration, and
                all three Zest actions - is <strong>gas-sponsored</strong>. You never need STX in
                your wallet just to pay a transaction fee: your wallet signs the action, and
                BitMax&apos;s own sponsor account covers the network fee.
              </p>
              <p>
                BitMax itself charges no fee on top of that. The boost paid to lockers is funded by
                the extra BTC their locked STX earns in Dual Stacking, not by a cut of anyone&apos;s
                base yield (see <a href="#boosting">Boosting</a>), and Zest&apos;s own interest
                rates and liquidation terms apply exactly as they would using Zest directly.
              </p>
            </DocSection>

            <DocSection id="safety" title="Safety & custody">
              <p>
                BitMax is non-custodial: it never holds a key that can move your funds without your
                own wallet signing the transaction. Deposited sBTC is staked via StackingDAO and can
                be redeemed back to a plain wallet balance at any time via <code>bitmax-vault</code>
                &apos;s <code>redeem</code> function.
              </p>
              <div className="rounded-xl border border-warning/25 bg-warning-soft p-4 text-warning">
                <p className="text-sm leading-relaxed">
                  <strong className="text-warning">Smart contracts carry inherent risk.</strong>{" "}
                  BitMax&apos;s own contracts are unaudited at this stage, and this is not financial
                  advice - only deposit what you&apos;re comfortable having exposed to
                  smart-contract risk while this project and the protocols it depends on (sBTC,
                  StackingDAO&apos;s stBTC, Zest) mature.
                </p>
              </div>
            </DocSection>

            <DocSection
              id="contracts"
              title="Contracts BitMax connects to"
              lead="Every contract your wallet is ever asked to sign a transaction for, or that this app reads balances from."
            >
              <p>
                Nothing here is guessed - every address below was confirmed directly against each
                protocol&apos;s own published source before being used.
              </p>

              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    BitMax&apos;s own contracts
                  </h3>
                  {!BITMAX_CONTRACTS_LIVE && (
                    <p className="mb-3 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-xs text-warning">
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
                        purpose:
                          "Each epoch, claims the extra Dual Stacking BTC and pays it out as lockers' boost.",
                      },
                      {
                        name: "mock-ststxbtc-pool",
                        principal: `${CONTRACT_DEPLOYER}.mock-ststxbtc-pool`,
                        purpose:
                          "Devnet/testnet stand-in for StackingDAO's stSTXbtc - pools locked STX and accrues the extra BTC that funds the boost.",
                      },
                    ]}
                    unavailableNote={BITMAX_CONTRACTS_LIVE ? undefined : "Not a real deployment"}
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    sBTC (Stacks Foundation)
                  </h3>
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
                  <h3 className="mb-3 text-sm font-semibold text-foreground">StackingDAO</h3>
                  <ContractTable
                    rows={[
                      {
                        name: "stbtc-token",
                        principal: "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token",
                        purpose: "The SIP-010 stBTC token - what your deposit earns.",
                      },
                      {
                        name: "stacking-dao-core-stbtc-v1",
                        principal:
                          "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1",
                        purpose: "StackingDAO's own deposit/withdraw entrypoint for stBTC.",
                      },
                      {
                        name: "stacking-dao-core-ststxbtc-v2",
                        principal:
                          "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-ststxbtc-v2",
                        purpose:
                          "StackingDAO's Dual Stacking pool for STX - where locked STX earns the boost. mock-ststxbtc-pool stands in until it's wired up.",
                      },
                    ]}
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Zest Protocol</h3>
                  <ContractTable
                    rows={[
                      {
                        name: "v0-8-market",
                        principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-8-market",
                        purpose:
                          "Supply collateral, borrow, and repay - the Borrow page's core contract.",
                      },
                      {
                        name: "v0-market-vault",
                        principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-market-vault",
                        purpose: "Read-only: your real supplied collateral and loan status.",
                      },
                      {
                        name: "v0-assets",
                        principal: "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-assets",
                        purpose:
                          "Registry BitMax uses to resolve stBTC/USDCx contract addresses live.",
                      },
                    ]}
                  />
                </div>
              </div>

              <p className="text-xs">
                <code>bitmax-vault</code>&apos;s own staking calls, and <code>ve-stx-lock</code>
                &apos;s STX pooling, currently target mock StackingDAO stand-ins on devnet/testnet,
                not the real <code>stacking-dao-core-stbtc-v1</code> and{" "}
                <code>stacking-dao-core-ststxbtc-v2</code> contracts above - the Borrow page&apos;s
                stBTC balance display does read the real token contract, but the vault&apos;s
                deposit flow and the boost&apos;s Dual Stacking pooling haven&apos;t been switched
                over yet.
              </p>
            </DocSection>

            <DocSection id="external" title="External resources">
              <div className="grid gap-3 sm:grid-cols-2">
                {RESOURCES.map((res, i) => (
                  <a
                    key={res.href}
                    href={res.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`lift group rounded-xl border border-border bg-surface p-4 hover:border-brand/40 hover:lift-hover ${
                      i === RESOURCES.length - 1 ? "sm:col-span-2" : ""
                    }`}
                  >
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      {res.title}
                      <ExternalIcon
                        size={13}
                        className="text-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                    </p>
                    <p className="mt-1 text-sm text-muted">{res.body}</p>
                  </a>
                ))}
              </div>
            </DocSection>
          </div>
        </div>
      </div>
    </div>
  );
}
