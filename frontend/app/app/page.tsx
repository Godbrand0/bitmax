"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import {
  depositSbtc,
  getLockWeight,
  getSbtcBalance,
  getVaultBalance,
  getVaultPrincipal,
  redeemStbtc,
} from "@/lib/vault";
import { btcToSats, satsToBtc } from "@/lib/format";
import { Card, PrimaryButton, StatTile, TextInput } from "@/components/Card";
import { Status } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function Dashboard() {
  const wallet = useWallet();
  const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
  const [vaultPrincipal, setVaultPrincipal] = useState<bigint | null>(null);
  const [sbtcBalance, setSbtcBalance] = useState<bigint | null>(null);
  const [weight, setWeight] = useState<bigint>(0n);

  const [startEarningAmount, setStartEarningAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { text: string; kind: "info" | "error" | "success" } | undefined>
  >({});
  const [networkError, setNetworkError] = useState<string | null>(null);

  const setMessage = (key: string, text: string, kind: "info" | "error" | "success") =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  const refresh = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const [balance, principal, w, sbtc] = await Promise.all([
        getVaultBalance(wallet.address),
        getVaultPrincipal(wallet.address),
        getLockWeight(wallet.address),
        getSbtcBalance(wallet.address),
      ]);
      setVaultBalance(balance);
      setVaultPrincipal(principal);
      setWeight(w);
      setSbtcBalance(sbtc);
      setNetworkError(null);
    } catch {
      // Most commonly: no Stacks node reachable at the configured network
      // (e.g. devnet isn't running). Fail quietly here rather than crash -
      // the rest of the dashboard (deposit/lock forms) still works once a
      // node is reachable and the user retries.
      setNetworkError(
        "We can't reach the Stacks network right now, so your balance can't be shown. If you're on devnet, make sure `clarinet devnet start` is running, then refresh."
      );
    }
  }, [wallet.address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleStartEarning() {
    setBusy("start-earning");
    try {
      const amountSats = btcToSats(startEarningAmount);
      await depositSbtc(amountSats);
      setMessage("start-earning", "Submitted! Your balance below will update once the network confirms it.", "success");
      await refresh();
    } catch (err) {
      setMessage("start-earning", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleRedeem() {
    setBusy("redeem");
    try {
      const amountSats = btcToSats(redeemAmount);
      await redeemStbtc(amountSats);
      setMessage(
        "redeem",
        "Done! That amount is now a regular, freely-usable balance in your own wallet - head to Borrow to use it as collateral on Zest.",
        "success"
      );
      await refresh();
    } catch (err) {
      setMessage("redeem", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  const yieldEarned = vaultBalance !== null && vaultPrincipal !== null ? vaultBalance - vaultPrincipal : null;
  const boosted = weight > 0n;

  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-4xl px-4 py-10 sm:px-6">
        {!wallet.address ? (
          <ConnectPrompt text="Connect your wallet to see your dashboard." />
        ) : (
          <div className="flex flex-col gap-6">
            {networkError && <Status text={networkError} kind="error" />}

            <Card title="Your balance">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {vaultBalance === null ? "..." : `${satsToBtc(vaultBalance)} BTC`}
              </p>
              <p className="mt-1 text-muted">currently growing in BitMax</p>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
                <StatTile
                  label="You put in"
                  value={vaultPrincipal === null ? "..." : `${satsToBtc(vaultPrincipal)} BTC`}
                />
                <StatTile
                  label="You've earned"
                  tone="positive"
                  value={yieldEarned === null ? "..." : `+${satsToBtc(yieldEarned)} BTC`}
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
                <p className="text-sm text-foreground/90">
                  {boosted ? (
                    <>
                      🚀 Your rewards are <strong>boosted</strong> - you&apos;re locking STX for a bigger
                      share.
                    </>
                  ) : (
                    <>You&apos;re earning at the base rate. Boosting can grow this faster.</>
                  )}
                </p>
                <Link
                  href="/app/boost"
                  className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                >
                  {boosted ? "Manage boost" : "Boost now"}
                </Link>
              </div>
            </Card>

            <Card title="Deposit sBTC to start earning">
              <p className="mb-3 text-muted">
                Your sBTC balance:{" "}
                <span className="font-medium text-foreground">
                  {sbtcBalance === null ? "..." : `${satsToBtc(sbtcBalance)} sBTC`}
                </span>
                . Deposit it here - that deposit is what starts it earning, immediately.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput
                  value={startEarningAmount}
                  onChange={setStartEarningAmount}
                  placeholder="Amount of sBTC to deposit, e.g. 0.01"
                />
                <PrimaryButton
                  disabled={busy === "start-earning" || !startEarningAmount}
                  onClick={handleStartEarning}
                >
                  {busy === "start-earning" ? "Submitting..." : "Deposit & Start Earning"}
                </PrimaryButton>
              </div>
              {messages["start-earning"] && <Status {...messages["start-earning"]!} />}
            </Card>

            <Card title="Use your balance elsewhere">
              <p className="mb-3 text-muted">
                Move some of your growing balance to a regular wallet balance you can use anywhere -
                including to borrow against it on Zest, without losing your rewards.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput value={redeemAmount} onChange={setRedeemAmount} placeholder="Amount in BTC to move out" />
                <PrimaryButton disabled={busy === "redeem" || !redeemAmount} onClick={handleRedeem}>
                  {busy === "redeem" ? "Moving..." : "Move to My Wallet"}
                </PrimaryButton>
                {messages["redeem"] && <Status {...messages["redeem"]!} />}
                <Link
                  href="/app/borrow"
                  className="text-center text-sm font-medium text-brand hover:underline"
                >
                  Borrow against it on Zest &rarr;
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
