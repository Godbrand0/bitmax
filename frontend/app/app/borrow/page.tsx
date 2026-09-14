"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import {
  borrowUsdc,
  estimateBorrowableUsdc,
  getBtcUsdPrice,
  getSuppliedStbtc,
  getUsdcBalance,
  hasOutstandingUsdcDebt,
  repayUsdc,
  supplyStbtcCollateral,
  ZEST_AVAILABLE,
} from "@/lib/zest";
import { getStbtcBalance } from "@/lib/vault";
import { btcToSats, satsToBtc } from "@/lib/format";
import { NETWORK_NAME } from "@/lib/network";
import { Badge, Card, PrimaryButton, SecondaryButton, StatTile, TextInput } from "@/components/Card";
import { Status, type StatusKind } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function BorrowPage() {
  const wallet = useWallet();
  const [stbtcBalance, setStbtcBalance] = useState<bigint | null>(null);
  const [suppliedStbtc, setSuppliedStbtc] = useState<bigint | null>(null);
  const [btcUsdPrice, setBtcUsdPrice] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);

  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; kind: StatusKind } | undefined>>({});

  const setMessage = (key: string, text: string, kind: StatusKind) =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  const refresh = useCallback(() => {
    if (!wallet.address) return;
    getStbtcBalance(wallet.address).then(setStbtcBalance).catch(() => setStbtcBalance(null));
    getSuppliedStbtc(wallet.address).then(setSuppliedStbtc).catch(() => setSuppliedStbtc(null));
    getBtcUsdPrice().then(setBtcUsdPrice).catch(() => setBtcUsdPrice(null));
    getUsdcBalance(wallet.address).then(setUsdcBalance).catch(() => setUsdcBalance(null));
    hasOutstandingUsdcDebt(wallet.address).then(setHasDebt).catch(() => setHasDebt(null));
  }, [wallet.address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real supplied collateral, not a guess from the input field - this is
  // what actually drives "available to borrow" now.
  const estimatedUsdc =
    suppliedStbtc !== null && btcUsdPrice !== null
      ? estimateBorrowableUsdc(suppliedStbtc, btcUsdPrice)
      : null;

  async function handleSupply() {
    if (!wallet.address) return;
    setBusy("supply");
    try {
      const amountSats = btcToSats(supplyAmount);
      // 1% slippage tolerance on the zToken shares Zest mints internally.
      const minShares = (amountSats * 99n) / 100n;
      await supplyStbtcCollateral(amountSats, minShares, wallet.address);
      setMessage("supply", "Submitted to Zest! Your stBTC is now supplied as collateral there.", "success");
      refresh();
    } catch (err) {
      setMessage("supply", err instanceof Error ? err.message : "Something went wrong.", "error");
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
      setMessage("borrow", "Submitted to Zest! The USDC will arrive in your wallet once confirmed.", "success");
      setBorrowAmount("");
      refresh();
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
    } catch (err) {
      setMessage("repay", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  function handleRepayMax() {
    if (usdcBalance === null) return;
    setRepayAmount((Number(usdcBalance) / 1_000_000).toString());
  }

  const actionColumns = hasDebt ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 py-10 sm:px-6">
        {!wallet.address ? (
          <ConnectPrompt text="Connect your wallet to borrow against your balance." />
        ) : !ZEST_AVAILABLE ? (
          <Card title="Borrow against your balance">
            <p className="text-muted">
              This calls Zest Protocol&apos;s real lending market directly - no middle contract, no
              leaving BitMax. Zest only runs on Stacks <strong>mainnet</strong> right now, though, and
              this app is currently pointed at <strong>{NETWORK_NAME}</strong>. Once BitMax itself is
              live on mainnet, this page starts working immediately - nothing else needs to change.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <Card title="Your Zest position">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatTile
                  label="Collateral supplied"
                  value={suppliedStbtc === null ? "..." : `${satsToBtc(suppliedStbtc)} stBTC`}
                />
                <StatTile
                  label="Estimated available to borrow"
                  tone="positive"
                  value={estimatedUsdc === null ? "..." : `~$${estimatedUsdc.toFixed(2)} USDC`}
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Loan status</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {hasDebt === null ? "..." : hasDebt ? "Active loan" : "None"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted">
                Collateral supplied and loan status are read directly from Zest. The borrow figure is
                a rough estimate only - based on a live BTC price and a conservative assumed limit,
                not Zest&apos;s exact on-chain calculation - so use it as a guide for what to type
                below, not a guarantee. Zest&apos;s own contract enforces the real limit when you
                actually borrow.
              </p>
            </Card>

            <div className={`grid grid-cols-1 gap-6 ${actionColumns}`}>
              <Card title="Supply stBTC as collateral" step={1}>
                <p className="mb-3 text-xs text-muted">
                  Your stBTC balance:{" "}
                  <span className="font-medium text-foreground">
                    {stbtcBalance === null ? "..." : `${satsToBtc(stbtcBalance)} stBTC`}
                  </span>
                </p>
                <div className="flex flex-col gap-3">
                  <TextInput
                    value={supplyAmount}
                    onChange={setSupplyAmount}
                    placeholder="Amount of stBTC to supply, e.g. 0.01"
                  />
                  <PrimaryButton disabled={busy === "supply" || !supplyAmount} onClick={handleSupply}>
                    {busy === "supply" ? "Submitting..." : "Supply to Zest"}
                  </PrimaryButton>
                </div>
                {messages["supply"] && <Status {...messages["supply"]!} />}
              </Card>

              <Card title="Borrow USDC" step={2}>
                <div className="flex flex-col gap-3">
                  <TextInput value={borrowAmount} onChange={setBorrowAmount} placeholder="Amount in USDC, e.g. 50" />
                  <PrimaryButton disabled={busy === "borrow" || !borrowAmount} onClick={handleBorrow}>
                    {busy === "borrow" ? "Submitting..." : "Borrow"}
                  </PrimaryButton>
                </div>
                {messages["borrow"] && <Status {...messages["borrow"]!} />}
                <p className="mt-3 text-xs text-muted">
                  Borrowing too much against too little collateral risks liquidation - Zest enforces
                  this on-chain and will reject an unsafe borrow.
                </p>
              </Card>

              {hasDebt && (
                <Card title="Repay USDC">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-muted">
                      Your USDC balance:{" "}
                      <span className="font-medium text-foreground">
                        {usdcBalance === null ? "..." : `$${(Number(usdcBalance) / 1_000_000).toFixed(2)}`}
                      </span>
                    </p>
                    <Badge tone="neutral">Active loan</Badge>
                  </div>
                  <div className="flex flex-col gap-3">
                    <TextInput value={repayAmount} onChange={setRepayAmount} placeholder="Amount in USDC, e.g. 50" />
                    <SecondaryButton disabled={usdcBalance === null} onClick={handleRepayMax}>
                      Use full balance
                    </SecondaryButton>
                    <PrimaryButton disabled={busy === "repay" || !repayAmount} onClick={handleRepay}>
                      {busy === "repay" ? "Submitting..." : "Repay"}
                    </PrimaryButton>
                  </div>
                  {messages["repay"] && <Status {...messages["repay"]!} />}
                  <p className="mt-3 text-xs text-muted">
                    Safe to overpay - Zest only ever takes what you actually owe, so typing more than
                    your debt (like your full balance) just clears it, nothing is wasted.
                  </p>
                </Card>
              )}
            </div>

            <Card title="Borrow against your balance">
              <p className="text-muted">
                This talks directly to Zest Protocol&apos;s own lending contract, signed by your wallet -
                BitMax never holds or routes these funds. Supply the stBTC you moved out in{" "}
                <span className="font-medium text-foreground">Use your balance elsewhere</span>, then
                borrow USDC against it without giving up your rewards.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
