"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import {
  borrowUsdc,
  estimateBorrowableUsdc,
  getBtcUsdPrice,
  getStbtcLtv,
  getSuppliedStbtc,
  getUsdcBalance,
  hasOutstandingUsdcDebt,
  removeStbtcCollateral,
  repayUsdc,
  supplyStbtcCollateral,
  ZEST_AVAILABLE,
} from "@/lib/zest";
import { getStbtcBalance } from "@/lib/vault";
import { btcToSats, satsToBtc } from "@/lib/format";
import { NETWORK_NAME } from "@/lib/network";
import { getContractCallHistory, parseUintRepr, type HistoryEntry } from "@/lib/history";
import { ZEST_DEPLOYER, ZEST_MARKET } from "@/lib/zest";
import {
  AmountInput,
  Badge,
  BorrowIcon,
  Button,
  Card,
  Chip,
  DepositIcon,
  Divider,
  InfoIcon,
  Skeleton,
  StatTile,
} from "@/components/ui";
import { Status, type StatusKind } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { AppShell } from "@/components/app/AppShell";
import { HistoryPanel, type HistoryRowInfo } from "@/components/history/HistoryPanel";

const ZEST_MARKET_CONTRACT_ID = `${ZEST_DEPLOYER}.${ZEST_MARKET}`;

function describeBorrowHistory(entry: HistoryEntry): HistoryRowInfo | null {
  switch (entry.functionName) {
    case "supply-collateral-add": {
      const sats = parseUintRepr(entry.args[1]);
      return {
        label: "Supplied collateral",
        direction: "out",
        amount: sats !== null ? `${satsToBtc(sats)} stBTC` : undefined,
        tag: "Zest",
      };
    }
    case "borrow": {
      const micro = parseUintRepr(entry.args[1]);
      return {
        label: "Borrowed",
        direction: "in",
        amount: micro !== null ? `$${(Number(micro) / 1_000_000).toFixed(2)} USDCx` : undefined,
        tag: "Zest",
      };
    }
    case "repay": {
      const micro = parseUintRepr(entry.args[1]);
      return {
        label: "Repaid",
        direction: "out",
        amount: micro !== null ? `$${(Number(micro) / 1_000_000).toFixed(2)} USDCx` : undefined,
        tag: "Zest",
      };
    }
    case "collateral-remove-redeem":
      // arg[1] here is Zest's internal zstBTC share count, not a raw stBTC
      // amount - showing it as one would misstate the real figure, so this
      // row deliberately carries no amount rather than a wrong-unit guess.
      return { label: "Withdrew collateral", direction: "in", tag: "Zest → stBTC" };
    default:
      return null;
  }
}

export default function BorrowPage() {
  const wallet = useWallet();
  const [stbtcBalance, setStbtcBalance] = useState<bigint | null>(null);
  const [suppliedStbtc, setSuppliedStbtc] = useState<bigint | null>(null);
  const [btcUsdPrice, setBtcUsdPrice] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);
  // Real LTV read from Zest's own v0-egroup, not a hardcoded guess - see
  // getStbtcLtv's header comment. null while loading; getStbtcLtv itself
  // never rejects (falls back to a conservative constant internally), so
  // this only ever stays null before the first read resolves.
  const [stbtcLtv, setStbtcLtv] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { text: string; kind: StatusKind } | undefined>
  >({});

  const setMessage = (key: string, text: string, kind: StatusKind) =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  const refresh = useCallback(() => {
    if (!wallet.address) return;
    getStbtcBalance(wallet.address).then(setStbtcBalance).catch(() => setStbtcBalance(null));
    getSuppliedStbtc(wallet.address).then(setSuppliedStbtc).catch(() => setSuppliedStbtc(null));
    getBtcUsdPrice().then(setBtcUsdPrice).catch(() => setBtcUsdPrice(null));
    getUsdcBalance(wallet.address).then(setUsdcBalance).catch(() => setUsdcBalance(null));
    hasOutstandingUsdcDebt(wallet.address).then(setHasDebt).catch(() => setHasDebt(null));
    getStbtcLtv(wallet.address).then(setStbtcLtv).catch(() => setStbtcLtv(null));
  }, [wallet.address]);

  const refreshHistory = useCallback(() => {
    if (!wallet.address) return;
    getContractCallHistory(wallet.address, [ZEST_MARKET_CONTRACT_ID])
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [wallet.address]);

  useEffect(() => {
    refresh();
    refreshHistory();
  }, [refresh, refreshHistory]);

  // Real supplied collateral and real on-chain LTV, not guesses.
  const estimatedUsdc =
    suppliedStbtc !== null && btcUsdPrice !== null && stbtcLtv !== null
      ? estimateBorrowableUsdc(suppliedStbtc, btcUsdPrice, stbtcLtv)
      : null;

  const hasCollateral = suppliedStbtc !== null && suppliedStbtc > 0n;

  async function handleSupply() {
    if (!wallet.address) return;
    setBusy("supply");
    try {
      const amountSats = btcToSats(supplyAmount);
      // 1% slippage tolerance on the zToken shares Zest mints internally.
      const minShares = (amountSats * 99n) / 100n;
      await supplyStbtcCollateral(amountSats, minShares, wallet.address);
      setMessage("supply", "Submitted to Zest! Your stBTC is now supplied as collateral.", "success");
      setSupplyAmount("");
      refresh();
      refreshHistory();
    } catch (err) {
      setMessage("supply", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdraw() {
    if (!wallet.address) return;
    setBusy("withdraw");
    try {
      const amountSats = btcToSats(withdrawAmount);
      await removeStbtcCollateral(amountSats, wallet.address);
      setMessage(
        "withdraw",
        "Submitted to Zest! Your stBTC will land back in your own wallet once confirmed.",
        "success"
      );
      setWithdrawAmount("");
      refresh();
      refreshHistory();
    } catch (err) {
      setMessage("withdraw", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleBorrow() {
    if (!wallet.address) return;
    setBusy("borrow");
    try {
      const amountUsdc = BigInt(Math.round(Number(borrowAmount) * 1_000_000));
      await borrowUsdc(amountUsdc, wallet.address);
      setMessage("borrow", "Submitted to Zest! The USDCx will arrive in your wallet once confirmed.", "success");
      setBorrowAmount("");
      refresh();
      refreshHistory();
    } catch (err) {
      setMessage("borrow", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleRepay() {
    if (!wallet.address) return;
    setBusy("repay");
    try {
      const amountUsdc = BigInt(Math.round(Number(repayAmount) * 1_000_000));
      await repayUsdc(amountUsdc, wallet.address);
      setMessage(
        "repay",
        "Submitted to Zest! Repaying more than you owe is safe - it only ever takes what you actually owe.",
        "success"
      );
      setRepayAmount("");
      refresh();
      refreshHistory();
    } catch (err) {
      setMessage("repay", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      title="Borrow against your balance"
      description="Supply stBTC as collateral on Zest Protocol's live lending market and borrow USDCx - without selling your position."
      aside={
        hasDebt ? (
          <Badge tone="warning" className="self-start">
            Active loan
          </Badge>
        ) : undefined
      }
    >
      {!wallet.address ? (
        <ConnectPrompt text="Connect your wallet to supply collateral and borrow against your balance." />
      ) : !ZEST_AVAILABLE ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
            <BorrowIcon size={24} />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            Borrowing unlocks on mainnet
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">
            This calls Zest Protocol&apos;s real lending market directly - no middle contract, no
            leaving BitMax. Zest only runs on Stacks <strong className="text-foreground">mainnet</strong>{" "}
            right now, and this app is currently pointed at{" "}
            <strong className="capitalize text-foreground">{NETWORK_NAME}</strong>. Once BitMax is
            live on mainnet this page starts working immediately - nothing else needs to change.
          </p>
          <Link href="/app" className="mt-6 inline-block">
            <Button variant="secondary" arrow>
              Back to dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Position ── */}
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Your Zest position
              </h2>
              <Chip>v0-8-market</Chip>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <StatTile
                size="large"
                label="Collateral supplied"
                value={
                  suppliedStbtc === null ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    satsToBtc(suppliedStbtc)
                  )
                }
                hint="stBTC held by Zest"
              />
              <StatTile
                size="large"
                label="Est. available to borrow"
                tone="positive"
                value={
                  estimatedUsdc === null ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    `~$${estimatedUsdc.toFixed(2)}`
                  )
                }
                hint={
                  stbtcLtv === null ? "USDCx" : `USDCx - at Zest's real ${(stbtcLtv * 100).toFixed(0)}% LTV`
                }
              />
              <StatTile
                size="large"
                label="Loan status"
                tone={hasDebt ? "brand" : "muted"}
                value={
                  hasDebt === null ? <Skeleton className="h-8 w-24" /> : hasDebt ? "Active loan" : "None"
                }
                hint={hasDebt ? "you owe USDCx to Zest" : "nothing borrowed"}
              />
            </div>

            <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-surface-muted px-4 py-3.5 text-xs leading-relaxed text-muted">
              <InfoIcon size={14} className="mt-px shrink-0" />
              <span>
                Collateral supplied, loan status, and the{" "}
                {stbtcLtv === null ? "LTV" : `${(stbtcLtv * 100).toFixed(0)}% LTV`} used below are
                all read directly from Zest. The borrow figure is still{" "}
                <strong className="text-foreground-soft">an estimate, not a guarantee</strong> -
                it prices your collateral with a public BTC feed rather than Zest&apos;s own live
                price oracle, so it can drift slightly from what Zest actually allows. Use it as a
                guide for what to type below; Zest&apos;s own contract enforces the real limit,
                with its own price, when you borrow.
              </span>
            </p>
          </section>

          {/* ── Actions ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Supply stBTC as collateral"
              step={1}
              subtitle="Zest holds this and lets you borrow against it. BitMax never routes these funds."
            >
              <div className="flex flex-col gap-4">
                <AmountInput
                  label="Amount to supply"
                  value={supplyAmount}
                  onChange={setSupplyAmount}
                  placeholder="0.00"
                  unit="stBTC"
                  max={stbtcBalance === null ? undefined : `${satsToBtc(stbtcBalance)} stBTC`}
                  onMax={
                    stbtcBalance === null ? undefined : () => setSupplyAmount(satsToBtc(stbtcBalance))
                  }
                />
                <Button
                  full
                  size="lg"
                  loading={busy === "supply"}
                  disabled={!supplyAmount}
                  onClick={handleSupply}
                  icon={<DepositIcon size={16} />}
                >
                  {busy === "supply" ? "Submitting" : "Supply to Zest"}
                </Button>
              </div>
              {messages["supply"] && <Status {...messages["supply"]!} />}

              {hasCollateral && (
                <>
                  <Divider label="or take it back" className="my-6" />
                  <div className="flex flex-col gap-4">
                    <AmountInput
                      label="Withdraw collateral"
                      value={withdrawAmount}
                      onChange={setWithdrawAmount}
                      placeholder="0.00"
                      unit="stBTC"
                      max={`${satsToBtc(suppliedStbtc)} stBTC`}
                      onMax={() => setWithdrawAmount(satsToBtc(suppliedStbtc))}
                      hint="Goes straight back to a plain stBTC balance in your own wallet. With an active loan, Zest rejects withdrawing more than keeps it safely collateralized - repay first for a full exit."
                    />
                    <Button
                      full
                      variant="secondary"
                      loading={busy === "withdraw"}
                      disabled={!withdrawAmount}
                      onClick={handleWithdraw}
                    >
                      {busy === "withdraw" ? "Submitting" : "Withdraw to my wallet"}
                    </Button>
                  </div>
                  {messages["withdraw"] && <Status {...messages["withdraw"]!} />}
                </>
              )}
            </Card>

            <div className="flex flex-col gap-6">
              <Card
                title="Borrow USDCx"
                step={2}
                subtitle="Borrowed straight from Zest's market against the collateral you supplied."
              >
                <div className="flex flex-col gap-4">
                  <AmountInput
                    label="Amount to borrow"
                    value={borrowAmount}
                    onChange={setBorrowAmount}
                    placeholder="0.00"
                    unit="USDCx"
                    max={estimatedUsdc === null ? undefined : `~$${estimatedUsdc.toFixed(2)} (est.)`}
                    hint="Borrowing too much against too little collateral risks liquidation - Zest enforces this on-chain and will reject an unsafe borrow."
                  />
                  <Button
                    full
                    size="lg"
                    loading={busy === "borrow"}
                    disabled={!borrowAmount || !hasCollateral}
                    onClick={handleBorrow}
                    icon={<BorrowIcon size={16} />}
                  >
                    {busy === "borrow" ? "Submitting" : "Borrow USDCx"}
                  </Button>
                  {!hasCollateral && (
                    <p className="text-center text-xs text-muted">
                      Supply collateral in step 1 first.
                    </p>
                  )}
                </div>
                {messages["borrow"] && <Status {...messages["borrow"]!} />}
              </Card>

              {hasDebt && (
                <Card
                  title="Repay USDCx"
                  step={3}
                  subtitle="Safe to overpay - Zest only ever takes what you actually owe."
                >
                  <div className="flex flex-col gap-4">
                    <AmountInput
                      label="Amount to repay"
                      value={repayAmount}
                      onChange={setRepayAmount}
                      placeholder="0.00"
                      unit="USDCx"
                      max={
                        usdcBalance === null
                          ? undefined
                          : `$${(Number(usdcBalance) / 1_000_000).toFixed(2)}`
                      }
                      onMax={
                        usdcBalance === null
                          ? undefined
                          : () => setRepayAmount((Number(usdcBalance) / 1_000_000).toString())
                      }
                    />
                    <Button
                      full
                      size="lg"
                      loading={busy === "repay"}
                      disabled={!repayAmount}
                      onClick={handleRepay}
                    >
                      {busy === "repay" ? "Submitting" : "Repay"}
                    </Button>
                  </div>
                  {messages["repay"] && <Status {...messages["repay"]!} />}
                </Card>
              )}
            </div>
          </div>

          <HistoryPanel
            title="Zest activity"
            subtitle="Your own supply, borrow, repay, and collateral withdrawals on Zest's real v0-8-market."
            entries={history}
            describe={describeBorrowHistory}
            emptyText="No Zest activity yet."
          />
        </div>
      )}
    </AppShell>
  );
}
