"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { getLock, getLockWeight, lockStx, registerForBoost, unlockStx } from "@/lib/vault";
import { getBlockHeight } from "@/lib/chain";
import { LOCK_DURATION_PRESETS, stxToUstx } from "@/lib/format";
import { Card, PrimaryButton, Select, TextInput } from "@/components/Card";
import { Status, type StatusKind } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function BoostPage() {
  const wallet = useWallet();
  const [weight, setWeight] = useState<bigint>(0n);
  const [lock, setLock] = useState<{ amount: bigint; unlockHeight: bigint } | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  const [lockAmount, setLockAmount] = useState("");
  const [lockPresetLabel, setLockPresetLabel] = useState<(typeof LOCK_DURATION_PRESETS)[number]["label"]>(
    LOCK_DURATION_PRESETS[0].label
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: StatusKind } | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const [w, l, height] = await Promise.all([
        getLockWeight(wallet.address),
        getLock(wallet.address),
        getBlockHeight(),
      ]);
      setWeight(w);
      setLock(l);
      setCurrentHeight(height);
    } catch {
      // same network-unavailable case as the dashboard - non-fatal here
    }
  }, [wallet.address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleLock() {
    setBusy("lock");
    try {
      const preset =
        LOCK_DURATION_PRESETS.find((p) => p.label === lockPresetLabel) ?? LOCK_DURATION_PRESETS[0];
      const amountUstx = stxToUstx(lockAmount);
      const height = await getBlockHeight();
      await lockStx(amountUstx, BigInt(height) + BigInt(preset.blocks));
      await registerForBoost();
      setMessage({ text: "Locked! Your boost applies from the next rewards round.", kind: "success" });
      await refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Something went wrong.", kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function handleUnlock() {
    setBusy("unlock");
    try {
      await unlockStx();
      setMessage({ text: "Unlocked! Your STX is back in your wallet.", kind: "success" });
      await refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Something went wrong.", kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  const isLocked = lock !== null;
  const isUnlockable = isLocked && currentHeight !== null && BigInt(currentHeight) >= lock.unlockHeight;

  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 py-10 sm:px-6">
        {!wallet.address ? (
          <ConnectPrompt text="Connect your wallet to boost your rewards." />
        ) : (
          <div className="flex flex-col gap-6">
            <Card title="Boosting is what BitMax is about">
              <p className="text-muted">
                Everyone earns the same Bitcoin Staking rewards on their balance, locked or not.
                Locking STX pools it into StackingDAO&apos;s real Dual Stacking product, which earns a
                separate, genuinely additional BTC reward - BitMax claims that reward each epoch and
                pays it to you in sBTC, weighted by how much and how long you locked. It&apos;s new
                yield your base rate never had, not a cut of anyone else&apos;s.
              </p>
            </Card>

            <Card title="Your current boost">
              <p className="text-3xl font-bold tabular-nums text-foreground">{weight.toString()}</p>
              <p className="mt-1 text-muted">boost weight</p>
              {isLocked && (
                <div className="mt-5 rounded-xl bg-surface-muted p-4 text-sm text-foreground/90">
                  <p>
                    You have <strong>{(Number(lock.amount) / 1_000_000).toString()} STX</strong> locked,
                    pooled into StackingDAO&apos;s Dual Stacking product and unlocking at block{" "}
                    {lock.unlockHeight.toString()}.
                  </p>
                  {isUnlockable ? (
                    <div className="mt-3">
                      <PrimaryButton disabled={busy === "unlock"} onClick={handleUnlock}>
                        {busy === "unlock" ? "Unlocking..." : "Unlock STX"}
                      </PrimaryButton>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted">Not unlockable yet - locks can&apos;t be ended early.</p>
                  )}
                </div>
              )}
            </Card>

            {!isLocked && (
              <Card title="Lock STX to boost your rewards">
                <p className="mb-3 text-muted">
                  Choose how much STX to lock and for how long. Your STX gets pooled into real Dual
                  Stacking and earns a genuinely additional BTC reward, paid to you in sBTC each epoch -
                  you get the STX itself back in full once the lock ends, never touched as a fee.
                </p>
                <div className="flex flex-col gap-3">
                  <TextInput value={lockAmount} onChange={setLockAmount} placeholder="Amount in STX, e.g. 100" />
                  <Select
                    value={lockPresetLabel}
                    onChange={setLockPresetLabel}
                    options={LOCK_DURATION_PRESETS.map((p) => ({ value: p.label, label: p.label }))}
                  />
                  <PrimaryButton disabled={busy === "lock" || !lockAmount} onClick={handleLock}>
                    {busy === "lock" ? "Locking..." : "Lock STX to Boost"}
                  </PrimaryButton>
                </div>
              </Card>
            )}

            {message && <Status {...message} />}
          </div>
        )}
      </div>
    </div>
  );
}
