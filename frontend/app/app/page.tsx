"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import {
  depositSbtc,
  getLifetimeBoostPaid,
  getLockWeight,
  getSbtcBalance,
  getVaultBalance,
  getVaultPrincipal,
  getVaultStbtcOwned,
  redeemStbtc,
  VAULT_AVAILABLE,
} from "@/lib/vault";
import { CONTRACT_DEPLOYER, CONTRACTS, NETWORK_NAME } from "@/lib/network";
import { btcToSats, satsToBtc } from "@/lib/format";
import { getContractCallHistory, parseUintRepr, type HistoryEntry } from "@/lib/history";
import {
  AmountInput,
  Badge,
  BoostIcon,
  Button,
  Card,
  DepositIcon,
  BorrowIcon,
  Skeleton,
  StatTile,
} from "@/components/ui";
import { Status } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { AppShell } from "@/components/app/AppShell";
import { HistoryPanel, type HistoryRowInfo } from "@/components/history/HistoryPanel";

// bitmax-vault's own function names, matched against each history entry -
// kept as a single source of truth so the describe() below and the
// contract-call filter can't silently drift apart.
const VAULT_CONTRACT_ID = `${CONTRACT_DEPLOYER}.${CONTRACTS.vault}`;

function describeVaultHistory(entry: HistoryEntry): HistoryRowInfo | null {
  const amountSats = parseUintRepr(entry.args[0]);
  const amount = amountSats !== null ? `${satsToBtc(amountSats)} BTC` : undefined;
  switch (entry.functionName) {
    case "deposit":
      return { label: "Deposit", direction: "out", amount, tag: "sBTC → vault" };
    case "redeem":
      return { label: "Withdraw", direction: "in", amount, tag: "→ stBTC" };
    case "request-redeem-to-sbtc":
      return { label: "Withdraw requested", direction: "neutral", amount, tag: "→ sBTC, cooling down" };
    case "claim-redeem-to-sbtc":
      return { label: "Withdraw claimed", direction: "in", tag: "sBTC" };
    default:
      return null;
  }
}

type MessageKind = "info" | "error" | "success";

export default function Dashboard() {
  const wallet = useWallet();
  const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
  const [vaultPrincipal, setVaultPrincipal] = useState<bigint | null>(null);
  // Raw stBTC owned - what redeem() actually operates on, distinct from
  // vaultBalance's live sBTC-equivalent value. Withdraw always redeems this
  // exact figure in full: reading, displaying, and submitting the same raw
  // number end to end means there's no "type an amount close to the max"
  // step where those two different units could ever be confused - vaultBalance
  // is always a little larger than this once any yield has accrued (1 stBTC
  // is worth more than 1 sBTC), so using it here would ask the contract to
  // redeem slightly more than is actually owned and revert every time.
  const [stbtcOwned, setStbtcOwned] = useState<bigint | null>(null);
  const [sbtcBalance, setSbtcBalance] = useState<bigint | null>(null);
  const [weight, setWeight] = useState<bigint>(0n);
  const [boostEarned, setBoostEarned] = useState<bigint | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const [startEarningAmount, setStartEarningAmount] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { text: string; kind: MessageKind } | undefined>
  >({});
  const [networkError, setNetworkError] = useState<string | null>(null);

  const setMessage = (key: string, text: string, kind: MessageKind) =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  const refresh = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const [balance, principal, owned, w, sbtc, boost] = await Promise.all([
        getVaultBalance(wallet.address),
        getVaultPrincipal(wallet.address),
        getVaultStbtcOwned(wallet.address),
        getLockWeight(wallet.address),
        getSbtcBalance(wallet.address),
        getLifetimeBoostPaid(wallet.address),
      ]);
      setVaultBalance(balance);
      setVaultPrincipal(principal);
      setStbtcOwned(owned);
      setWeight(w);
      setSbtcBalance(sbtc);
      setBoostEarned(boost);
      setNetworkError(null);
    } catch {
      // Most commonly: no Stacks node reachable at the configured network
      // (e.g. devnet isn't running). Fail quietly rather than crash - the
      // deposit/redeem forms still work once a node is reachable.
      setNetworkError(
        "We can't reach the Stacks network right now, so your balance can't be shown. If you're on devnet, make sure `clarinet devnet start` is running, then refresh."
      );
    }
  }, [wallet.address]);

  const refreshHistory = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const entries = await getContractCallHistory(wallet.address, [VAULT_CONTRACT_ID]);
      setHistory(entries);
    } catch {
      // Non-critical: history is a convenience view, not core state - leave
      // it empty rather than surface a second error banner over it.
      setHistory([]);
    }
  }, [wallet.address]);

  useEffect(() => {
    refresh();
    refreshHistory();
  }, [refresh, refreshHistory]);

  async function handleStartEarning() {
    setBusy("start-earning");
    try {
      const amountSats = btcToSats(startEarningAmount);
      await depositSbtc(amountSats);
      setMessage(
        "start-earning",
        "Submitted! Your balance will update once the network confirms it.",
        "success"
      );
      await refresh();
      await refreshHistory();
    } catch (err) {
      setMessage(
        "start-earning",
        err instanceof Error ? err.message : "Something went wrong.",
        "error"
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRedeem() {
    if (stbtcOwned === null || stbtcOwned === 0n) return;
    setBusy("redeem");
    try {
      // Always redeems the exact figure just read and shown - no typed
      // amount, so there's no partial-withdraw path and no way to submit a
      // number that drifted from what's actually owned by the time the
      // wallet signs.
      await redeemStbtc(stbtcOwned);
      setMessage(
        "redeem",
        "Done! That stBTC is now a regular, freely-usable balance in your own wallet - head to Borrow to use it as collateral on Zest.",
        "success"
      );
      await refresh();
      await refreshHistory();
    } catch (err) {
      setMessage("redeem", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  const yieldEarned =
    vaultBalance !== null && vaultPrincipal !== null ? vaultBalance - vaultPrincipal : null;
  const boosted = weight > 0n;
  // Shown whenever there's something to show, not only while currently
  // locked - lifetime-boost-paid is a permanent on-chain total, so a past
  // locker who's since unlocked should still see what boosting earned them.
  const hasEarnedBoost = boostEarned !== null && boostEarned > 0n;

  // Real return since deposit, computed from chain data - not a projection.
  const returnPct =
    yieldEarned !== null && vaultPrincipal !== null && vaultPrincipal > 0n
      ? (Number(yieldEarned) / Number(vaultPrincipal)) * 100
      : null;

  return (
    <AppShell
      title="Your dashboard"
      description="Everything you've deposited, what it's earned, and how to maximize it from here."
      aside={
        boosted ? (
          <Badge tone="brand" className="self-start">
            <BoostIcon size={12} />
            Boost active
          </Badge>
        ) : undefined
      }
    >
      {!wallet.address ? (
        <ConnectPrompt text="Connect your wallet to see your balance, deposit sBTC, and track what you've earned." />
      ) : (
        <div className="flex flex-col gap-6">
          {networkError && <Status text={networkError} kind="error" />}

          {/* ── Balance hero ── */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Your position
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  Growing in BitMax
                </p>

                <div className="mt-5 grid grid-cols-2 gap-6">
                  <StatTile
                    size="large"
                    label="You put in"
                    value={
                      vaultPrincipal === null ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        `${satsToBtc(vaultPrincipal)}`
                      )
                    }
                    hint="sBTC deposited"
                  />
                  <StatTile
                    size="large"
                    label="You've earned"
                    tone="positive"
                    value={
                      yieldEarned === null ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        `+${satsToBtc(yieldEarned)}`
                      )
                    }
                    hint={
                      returnPct === null
                        ? "sBTC in rewards"
                        : `+${returnPct.toFixed(4)}% since deposit`
                    }
                  />
                </div>
              </div>

              {/* Boost status */}
              <div
                className={`rounded-xl border p-5 transition-colors ${
                  boosted ? "border-brand/30 bg-brand-softer" : "border-border bg-surface-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      boosted ? "bg-brand text-white shadow-glow" : "bg-surface text-muted"
                    }`}
                  >
                    <BoostIcon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {boosted ? "Your yield is boosted" : "Earning at the base rate"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      {boosted ? (
                        <>
                          Your locked STX is lifting the rate this balance earns - boost weight{" "}
                          <span className="num font-semibold text-foreground">
                            {weight.toString()}
                          </span>
                          .
                        </>
                      ) : (
                        "Lock STX to raise the rate this balance earns. The boost is funded by your locked STX, so it only ever adds to your yield."
                      )}
                    </p>
                  </div>
                </div>

                {(boosted || hasEarnedBoost) && (
                  <div className="mt-4 rounded-lg bg-surface px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      sBTC earned from your STX lock
                    </p>
                    <p className="num mt-1 text-lg font-semibold text-success">
                      {boostEarned === null ? (
                        <Skeleton className="h-5 w-24" />
                      ) : (
                        `+${satsToBtc(boostEarned)} sBTC`
                      )}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Paid straight to your wallet each epoch, not into this balance above -
                      lifetime total, separate from your vault yield.
                    </p>
                  </div>
                )}

                <Link href="/app/boost" className="mt-5 block">
                  <Button full variant={boosted ? "secondary" : "primary"} arrow>
                    {boosted ? "Manage boost" : "Boost my rewards"}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* ── Actions ── */}
          {!VAULT_AVAILABLE ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                <DepositIcon size={24} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                Depositing unlocks on mainnet
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                The vault stakes your sBTC directly with StackingDAO&apos;s real mainnet contracts -
                no devnet/testnet stand-in. StackingDAO only runs on Stacks{" "}
                <strong className="text-foreground">mainnet</strong>, and this app is currently
                pointed at <strong className="capitalize text-foreground">{NETWORK_NAME}</strong>.
                Once BitMax is live on mainnet this page starts working immediately - nothing else
                needs to change.
              </p>
            </div>
          ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Deposit sBTC"
              subtitle="Staked via StackingDAO into stBTC and held for you by bitmax-vault. It starts earning immediately."
              icon={<DepositIcon size={16} />}
            >
              <div className="flex flex-col gap-4">
                <AmountInput
                  label="Amount to deposit"
                  value={startEarningAmount}
                  onChange={setStartEarningAmount}
                  placeholder="0.00"
                  unit="sBTC"
                  max={sbtcBalance === null ? undefined : `${satsToBtc(sbtcBalance)} sBTC`}
                  onMax={
                    sbtcBalance === null
                      ? undefined
                      : () => setStartEarningAmount(satsToBtc(sbtcBalance))
                  }
                />
                <Button
                  full
                  size="lg"
                  loading={busy === "start-earning"}
                  disabled={!startEarningAmount}
                  onClick={handleStartEarning}
                >
                  {busy === "start-earning" ? "Submitting" : "Deposit & start earning"}
                </Button>
              </div>
              {messages["start-earning"] && <Status {...messages["start-earning"]!} />}
            </Card>

            <Card
              title="Withdraw"
              subtitle="Withdraws your full balance as stBTC to your own wallet - a plain SIP-010 balance you can use anywhere, including as collateral on Zest. This isn't a Bitcoin peg-out."
              icon={<BorrowIcon size={16} />}
            >
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-surface-muted px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Available to withdraw
                  </p>
                  <p className="num mt-1 text-2xl font-semibold text-foreground">
                    {stbtcOwned === null ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      `${satsToBtc(stbtcOwned)} stBTC`
                    )}
                  </p>
                </div>
                <Button
                  full
                  size="lg"
                  variant="secondary"
                  loading={busy === "redeem"}
                  disabled={stbtcOwned === null || stbtcOwned === 0n}
                  onClick={handleRedeem}
                >
                  {busy === "redeem" ? "Withdrawing" : "Withdraw everything to my wallet"}
                </Button>
              </div>
              {messages["redeem"] && <Status {...messages["redeem"]!} />}
              <Link
                href="/app/borrow"
                className="group mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                Borrow against it on Zest
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </Link>
            </Card>
          </div>
          )}

          <HistoryPanel
            title="Transaction history"
            subtitle="Your own deposits and withdrawals on bitmax-vault, most recent first."
            entries={history}
            describe={describeVaultHistory}
            emptyText="No deposits or withdrawals yet."
          />
        </div>
      )}
    </AppShell>
  );
}
