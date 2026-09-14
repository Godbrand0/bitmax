"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { borrowUsdc, estimateBorrowableUsdc, getBtcUsdPrice, supplyStbtcCollateral, ZEST_AVAILABLE } from "@/lib/zest";
import { getSbtcBalance } from "@/lib/vault";
import { btcToSats, satsToBtc } from "@/lib/format";
import { NETWORK_NAME } from "@/lib/network";
import { Card, PrimaryButton, TextInput } from "@/components/Card";
import { Status, type StatusKind } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function BorrowPage() {
  const wallet = useWallet();
  const [sbtcBalance, setSbtcBalance] = useState<bigint | null>(null);
  const [btcUsdPrice, setBtcUsdPrice] = useState<number | null>(null);

  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; kind: StatusKind } | undefined>>({});

  const setMessage = (key: string, text: string, kind: StatusKind) =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  useEffect(() => {
    if (!wallet.address) return;
    getSbtcBalance(wallet.address).then(setSbtcBalance).catch(() => setSbtcBalance(null));
    getBtcUsdPrice().then(setBtcUsdPrice).catch(() => setBtcUsdPrice(null));
  }, [wallet.address]);

  let estimatedUsdc: number | null = null;
  try {
    if (supplyAmount && btcUsdPrice !== null) {
      estimatedUsdc = estimateBorrowableUsdc(btcToSats(supplyAmount), btcUsdPrice);
    }
  } catch {
    estimatedUsdc = null;
  }

  async function handleSupply() {
    if (!wallet.address) return;
    setBusy("supply");
    try {
      const amountSats = btcToSats(supplyAmount);
      // 1% slippage tolerance on the zToken shares Zest mints internally.
      const minShares = (amountSats * 99n) / 100n;
      await supplyStbtcCollateral(amountSats, minShares, wallet.address);
      setMessage("supply", "Submitted to Zest! Your stBTC is now supplied as collateral there.", "success");
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
    } catch (err) {
      setMessage("borrow", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-2xl px-4 py-10 sm:px-6">
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
            <Card title="Borrow against your balance">
              <p className="text-muted">
                This talks directly to Zest Protocol&apos;s own lending contract, signed by your wallet -
                BitMax never holds or routes these funds. Supply the stBTC you moved out in{" "}
                <span className="font-medium text-foreground">Use your balance elsewhere</span>, then
                borrow USDC against it without giving up your rewards.
              </p>
            </Card>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Card title="Supply stBTC as collateral" step={1}>
                  <p className="mb-3 text-xs text-muted">
                    Your sBTC balance:{" "}
                    <span className="font-medium text-foreground">
                      {sbtcBalance === null ? "..." : `${satsToBtc(sbtcBalance)} sBTC`}
                    </span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <TextInput
                      value={supplyAmount}
                      onChange={setSupplyAmount}
                      placeholder="Amount of sBTC to supply, e.g. 0.01"
                    />
                    <PrimaryButton disabled={busy === "supply" || !supplyAmount} onClick={handleSupply}>
                      {busy === "supply" ? "Submitting..." : "Supply to Zest"}
                    </PrimaryButton>
                  </div>
                  {estimatedUsdc !== null && (
                    <p className="mt-3 text-xs text-muted">
                      Estimated up to <span className="font-medium text-foreground">~${estimatedUsdc.toFixed(2)} USDC</span>{" "}
                      borrowable against this. A rough guide only, based on a live BTC price and a
                      conservative assumed limit - Zest&apos;s own contract enforces the real limit
                      when you borrow.
                    </p>
                  )}
                  {messages["supply"] && <Status {...messages["supply"]!} />}
                </Card>
              </div>

              <div className="flex-1">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
