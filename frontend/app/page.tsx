"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { depositBtcToSbtc } from "@/lib/sbtc";
import {
  depositSbtc,
  getLock,
  getLockWeight,
  getVaultBalance,
  lockStx,
  redeemStbtc,
  registerForBoost,
} from "@/lib/vault";
import { getBlockHeight } from "@/lib/chain";
import { btcToSats, LOCK_DURATION_PRESETS, satsToBtc, stxToUstx } from "@/lib/format";
import { NETWORK_NAME } from "@/lib/network";
import { Card, PrimaryButton, TextInput } from "@/components/Card";

const ZEST_APP_URL = "https://app.zestprotocol.com";

function Status({ text, kind }: { text: string; kind: "info" | "error" | "success" }) {
  const color =
    kind === "error"
      ? "text-red-600 dark:text-red-400"
      : kind === "success"
        ? "text-green-600 dark:text-green-400"
        : "text-zinc-500 dark:text-zinc-400";
  return <p className={`mt-3 text-sm ${color}`}>{text}</p>;
}

export default function Home() {
  const wallet = useWallet();
  const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
  const [weight, setWeight] = useState<bigint>(0n);
  const [lock, setLock] = useState<{ amount: bigint; unlockHeight: bigint } | null>(null);

  const [bringInAmount, setBringInAmount] = useState("");
  const [startEarningAmount, setStartEarningAmount] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [lockPreset, setLockPreset] = useState<(typeof LOCK_DURATION_PRESETS)[number]>(
    LOCK_DURATION_PRESETS[0]
  );
  const [redeemAmount, setRedeemAmount] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; kind: "info" | "error" | "success" } | undefined>>({});
  const [networkError, setNetworkError] = useState<string | null>(null);

  const setMessage = (key: string, text: string, kind: "info" | "error" | "success") =>
    setMessages((m) => ({ ...m, [key]: { text, kind } }));

  const refresh = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const [balance, w, l] = await Promise.all([
        getVaultBalance(wallet.address),
        getLockWeight(wallet.address),
        getLock(wallet.address),
      ]);
      setVaultBalance(balance);
      setWeight(w);
      setLock(l);
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

  async function handleBringInBitcoin() {
    if (!wallet.address || !wallet.btcPublicKey) return;
    setBusy("bring-in");
    try {
      const amountSats = Number(btcToSats(bringInAmount));
      const { txid } = await depositBtcToSbtc({
        network: NETWORK_NAME === "mainnet" ? "mainnet" : "testnet",
        stacksAddress: wallet.address,
        reclaimPublicKey: wallet.btcPublicKey,
        amountSats,
      });
      setMessage(
        "bring-in",
        `Sent! Your Bitcoin transaction is ${txid}. It usually takes about 20 minutes for your Bitcoin-backed balance to show up here - that wait is real Bitcoin confirmation time, not something we can skip.`,
        "success"
      );
    } catch (err) {
      setMessage("bring-in", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

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

  async function handleLock() {
    setBusy("lock");
    try {
      const amountUstx = stxToUstx(lockAmount);
      const currentHeight = await getBlockHeight();
      await lockStx(amountUstx, BigInt(currentHeight) + BigInt(lockPreset.blocks));
      await registerForBoost();
      setMessage("lock", "Locked! Your boost will apply from the next rewards round.", "success");
      await refresh();
    } catch (err) {
      setMessage("lock", err instanceof Error ? err.message : "Something went wrong.", "error");
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
        "Done! That amount is now a regular, freely-usable balance in your own wallet - you can use it anywhere, including to borrow against it on Zest.",
        "success"
      );
      await refresh();
    } catch (err) {
      setMessage("redeem", err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">BitMax</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Grow your Bitcoin, simply.</p>
          </div>
          {wallet.address ? (
            <button
              onClick={wallet.disconnect}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {wallet.address.slice(0, 5)}...{wallet.address.slice(-4)}
            </button>
          ) : (
            <PrimaryButtonSmall onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting..." : "Connect Wallet"}
            </PrimaryButtonSmall>
          )}
        </header>

        {!wallet.address ? (
          <Card title="Welcome">
            <p className="mb-2">
              BitMax turns idle Bitcoin into a growing balance, automatically. Here&apos;s the whole
              idea in three steps:
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Bring in your Bitcoin - it becomes a Bitcoin-backed balance you can use on Stacks.</li>
              <li>It starts earning staking rewards automatically.</li>
              <li>
                Optionally, lock some STX to earn a bigger share of the rewards - and use your growing
                balance to borrow elsewhere, like Zest, without giving it up.
              </li>
            </ol>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">
              Connect a wallet (Leather or Xverse) above to get started.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {networkError && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {networkError}
              </div>
            )}
            <Card title="Your balance">
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {vaultBalance === null ? "..." : `${satsToBtc(vaultBalance)} BTC`}
              </p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">currently growing in BitMax</p>
              {lock && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  You have STX locked for a boost (current boost weight: {weight.toString()}).
                </p>
              )}
            </Card>

            <Card title="Bring in your Bitcoin" step={1}>
              <p className="mb-3 text-zinc-500 dark:text-zinc-400">
                Send Bitcoin from your wallet. This takes about 20 minutes to confirm on the Bitcoin
                network - that&apos;s real Bitcoin security, not a delay we add.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput value={bringInAmount} onChange={setBringInAmount} placeholder="Amount in BTC, e.g. 0.01" />
                <PrimaryButton disabled={busy === "bring-in" || !bringInAmount} onClick={handleBringInBitcoin}>
                  {busy === "bring-in" ? "Sending..." : "Bring in Bitcoin"}
                </PrimaryButton>
              </div>
              {messages["bring-in"] && <Status {...messages["bring-in"]!} />}
            </Card>

            <Card title="Start earning" step={2}>
              <p className="mb-3 text-zinc-500 dark:text-zinc-400">
                Once your Bitcoin-backed balance has arrived, put it to work here to start earning
                staking rewards.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput
                  value={startEarningAmount}
                  onChange={setStartEarningAmount}
                  placeholder="Amount in BTC, e.g. 0.01"
                />
                <PrimaryButton
                  disabled={busy === "start-earning" || !startEarningAmount}
                  onClick={handleStartEarning}
                >
                  {busy === "start-earning" ? "Submitting..." : "Start Earning"}
                </PrimaryButton>
              </div>
              {messages["start-earning"] && <Status {...messages["start-earning"]!} />}
            </Card>

            <Card title="Boost your rewards (optional)" step={3}>
              <p className="mb-3 text-zinc-500 dark:text-zinc-400">
                Lock some STX for a while to earn a bigger share of the rewards pool. The longer you
                lock, the bigger your boost - you get the STX back once the lock ends.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput value={lockAmount} onChange={setLockAmount} placeholder="Amount in STX, e.g. 100" />
                <select
                  value={lockPreset.label}
                  onChange={(e) =>
                    setLockPreset(
                      LOCK_DURATION_PRESETS.find((p) => p.label === e.target.value) ??
                        LOCK_DURATION_PRESETS[0]
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  {LOCK_DURATION_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <PrimaryButton disabled={busy === "lock" || !lockAmount} onClick={handleLock}>
                  {busy === "lock" ? "Locking..." : "Lock STX to Boost"}
                </PrimaryButton>
              </div>
              {messages["lock"] && <Status {...messages["lock"]!} />}
            </Card>

            <Card title="Use your balance elsewhere">
              <p className="mb-3 text-zinc-500 dark:text-zinc-400">
                Move some of your growing balance to a regular wallet balance you can use anywhere -
                including to borrow against it on Zest, without losing your rewards.
              </p>
              <div className="flex flex-col gap-3">
                <TextInput value={redeemAmount} onChange={setRedeemAmount} placeholder="Amount in BTC to move out" />
                <PrimaryButton disabled={busy === "redeem" || !redeemAmount} onClick={handleRedeem}>
                  {busy === "redeem" ? "Moving..." : "Move to My Wallet"}
                </PrimaryButton>
                {messages["redeem"] && <Status {...messages["redeem"]!} />}
                <a
                  href={ZEST_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Open Zest to borrow against it &rarr;
                </a>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryButtonSmall({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
