"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import {
  claimUnlock,
  getLock,
  getLockWeight,
  getPendingWithdrawal,
  lockStx,
  registerForBoost,
  requestUnlock,
} from "@/lib/vault";
import { getBurnBlockHeight } from "@/lib/chain";
import { LOCK_DURATION_PRESETS, stxToUstx } from "@/lib/format";
import { CONTRACT_DEPLOYER, CONTRACTS } from "@/lib/network";
import { getContractCallHistory, parseUintRepr, type HistoryEntry } from "@/lib/history";
import {
  AmountInput,
  Badge,
  BoostIcon,
  Button,
  Card,
  CheckIcon,
  ClockIcon,
  LockIcon,
  SegmentedOptions,
  Skeleton,
  StatTile,
} from "@/components/ui";
import { Status, type StatusKind } from "@/components/Status";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { AppShell } from "@/components/app/AppShell";
import { HistoryPanel, type HistoryRowInfo } from "@/components/history/HistoryPanel";

const VE_LOCK_CONTRACT_ID = `${CONTRACT_DEPLOYER}.${CONTRACTS.veLock}`;

// Deliberately NOT a full "every epoch you were paid" ledger: the actual
// boost payout (bitmax-boost-distributor's credit-share) runs inside a
// keeper-triggered close-epoch call, never signed by the locker, so it
// never appears in this address's own transaction list - only the
// lock/unlock actions the locker themselves signed do. The dashboard's
// lifetime-boost-paid figure is the authoritative running total; this is
// "what you did", not "what you were paid".
function describeLockHistory(entry: HistoryEntry): HistoryRowInfo | null {
  const amountUstx = parseUintRepr(entry.args[0]);
  const amount = amountUstx !== null ? `${(Number(amountUstx) / 1_000_000).toLocaleString()} STX` : undefined;
  switch (entry.functionName) {
    case "lock-stx":
      return { label: "Locked STX", direction: "out", amount, tag: "boost started" };
    case "request-unlock":
      return { label: "Unlock requested", direction: "neutral", tag: "cooling down" };
    case "claim-unlock":
      return { label: "STX claimed", direction: "in", tag: "unlocked" };
    default:
      return null;
  }
}

// LOCK_DURATION_PRESETS below are counted in burn-block-height (Bitcoin
// blocks), which target ~10 minutes each by design - matching
// ve-stx-lock.clar's own clock (see that contract's header). Used only to
// turn block counts into human-readable estimates - always labelled
// approximate, since real Bitcoin block times vary around that average.
const MINUTES_PER_BLOCK = 10;

function formatBlocksAsDuration(blocks: number): string {
  const minutes = blocks * MINUTES_PER_BLOCK;
  const days = Math.round(minutes / (60 * 24));
  if (days < 1) return "less than a day";
  if (days < 14) return `about ${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  if (days < 365) return `about ${Math.round(days / 30)} months`;
  const years = days / 365;
  return `about ${years.toFixed(years < 2 ? 1 : 0)} years`;
}

export default function BoostPage() {
  const wallet = useWallet();
  const [weight, setWeight] = useState<bigint>(0n);
  const [lock, setLock] = useState<{ amount: bigint; unlockHeight: bigint } | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{
    amount: bigint;
    claimableAtHeight: bigint;
  } | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const [lockAmount, setLockAmount] = useState("");
  const [lockPresetLabel, setLockPresetLabel] = useState<
    (typeof LOCK_DURATION_PRESETS)[number]["label"]
  >(LOCK_DURATION_PRESETS[0].label);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: StatusKind } | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const [w, l, pending, height] = await Promise.all([
        getLockWeight(wallet.address),
        getLock(wallet.address),
        getPendingWithdrawal(wallet.address),
        getBurnBlockHeight(),
      ]);
      setWeight(w);
      setLock(l);
      setPendingWithdrawal(pending);
      setCurrentHeight(height);
    } catch {
      // Same network-unavailable case as the dashboard - non-fatal here.
    } finally {
      setLoaded(true);
    }
  }, [wallet.address]);

  const refreshHistory = useCallback(async () => {
    if (!wallet.address) return;
    try {
      const entries = await getContractCallHistory(wallet.address, [VE_LOCK_CONTRACT_ID]);
      setHistory(entries);
    } catch {
      setHistory([]);
    }
  }, [wallet.address]);

  useEffect(() => {
    refresh();
    refreshHistory();
  }, [refresh, refreshHistory]);

  async function handleLock() {
    setBusy("lock");
    try {
      const preset =
        LOCK_DURATION_PRESETS.find((p) => p.label === lockPresetLabel) ?? LOCK_DURATION_PRESETS[0];
      const amountUstx = stxToUstx(lockAmount);
      const height = await getBurnBlockHeight();
      await lockStx(amountUstx, BigInt(height) + BigInt(preset.blocks));
      await registerForBoost();
      setMessage({
        text: "Locked! Your boost applies from the next rewards round.",
        kind: "success",
      });
      await refresh();
      await refreshHistory();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Something went wrong.",
        kind: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleRequestUnlock() {
    setBusy("request-unlock");
    try {
      await requestUnlock();
      setMessage({
        text: "Unlock started! Your STX now has its own separate cooldown before it can be claimed - see below for how long.",
        kind: "success",
      });
      await refresh();
      await refreshHistory();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Something went wrong.",
        kind: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleClaimUnlock() {
    setBusy("claim-unlock");
    try {
      await claimUnlock();
      setMessage({ text: "Claimed! Your STX is back in your wallet.", kind: "success" });
      await refresh();
      await refreshHistory();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Something went wrong.",
        kind: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  const isLocked = lock !== null;
  const isUnlockable =
    isLocked && currentHeight !== null && BigInt(currentHeight) >= lock.unlockHeight;

  const blocksRemaining =
    isLocked && currentHeight !== null
      ? Number(lock.unlockHeight - BigInt(currentHeight))
      : null;

  const hasPendingWithdrawal = pendingWithdrawal !== null;
  const isClaimable =
    hasPendingWithdrawal &&
    currentHeight !== null &&
    BigInt(currentHeight) >= pendingWithdrawal.claimableAtHeight;
  const blocksUntilClaimable =
    hasPendingWithdrawal && currentHeight !== null
      ? Number(pendingWithdrawal.claimableAtHeight - BigInt(currentHeight))
      : null;

  // Blocks lock-stx while either is true, matching ve-stx-lock.clar's own
  // guard (ERR-EXISTING-LOCK / ERR-EXISTING-WITHDRAWAL) - a pending
  // withdrawal must be claimed before a new lock can start.
  const blocksNewLock = isLocked || hasPendingWithdrawal;

  const selectedPreset =
    LOCK_DURATION_PRESETS.find((p) => p.label === lockPresetLabel) ?? LOCK_DURATION_PRESETS[0];

  return (
    <AppShell
      title="Boost your rewards"
      description="Lock STX to raise the rate your deposited Bitcoin earns. One yield, boosted higher."
      aside={
        isLocked ? (
          <Badge tone="brand" className="self-start">
            <LockIcon size={12} />
            STX locked
          </Badge>
        ) : hasPendingWithdrawal ? (
          <Badge tone={isClaimable ? "success" : "warning"} className="self-start">
            <ClockIcon size={12} />
            {isClaimable ? "Ready to claim" : "Unlock cooling down"}
          </Badge>
        ) : undefined
      }
    >
      {!wallet.address ? (
        <ConnectPrompt text="Connect your wallet to lock STX and boost your rewards." />
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── The idea ── */}
          <Card tone="brand" className="border-brand/25">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
                <BoostIcon size={20} />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Your rate goes up. Nobody else&apos;s goes down.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  There&apos;s one yield here - the one your deposited sBTC earns - and locking STX
                  raises it. Your STX goes to work in StackingDAO&apos;s Dual Stacking product, and
                  the extra BTC it earns is paid onto your balance in sBTC each epoch, weighted by
                  how much and how long you locked. Because the boost is funded by your own locked
                  STX, it adds to your yield instead of taking a share of anyone else&apos;s. Your
                  STX comes back in full when the lock ends.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* ── Current position ── */}
            <Card title="Your current boost" icon={<BoostIcon size={16} />}>
              <div className="flex items-baseline gap-2">
                {!loaded ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <span className="num text-4xl font-semibold tracking-tight text-foreground">
                    {weight.toString()}
                  </span>
                )}
                <span className="text-sm font-medium text-muted">boost weight</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Your share of each epoch&apos;s boost is this weight divided by the total weight of
                all lockers. More STX, or a longer lock, means a bigger boost.
              </p>

              {isLocked ? (
                <div className="mt-6 rounded-xl border border-border bg-surface-muted p-5">
                  <div className="grid grid-cols-2 gap-5">
                    <StatTile
                      label="STX locked"
                      value={`${(Number(lock.amount) / 1_000_000).toLocaleString()}`}
                      hint="pooled into Dual Stacking"
                    />
                    <StatTile
                      label="Unlocks at block"
                      value={lock.unlockHeight.toString()}
                      hint={
                        blocksRemaining !== null && blocksRemaining > 0
                          ? `${blocksRemaining.toLocaleString()} blocks to go`
                          : "reached"
                      }
                    />
                  </div>

                  {isUnlockable ? (
                    <div className="mt-5">
                      <Status
                        text="Your lock has ended - start the unlock to begin its separate withdrawal cooldown."
                        kind="success"
                      />
                      <div className="mt-3">
                        <Button
                          full
                          loading={busy === "request-unlock"}
                          onClick={handleRequestUnlock}
                          icon={<ClockIcon size={16} />}
                        >
                          {busy === "request-unlock" ? "Starting unlock" : "Start unlock"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 flex items-start gap-2.5 rounded-lg bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
                      <ClockIcon size={14} className="mt-px shrink-0" />
                      <span>
                        {blocksRemaining !== null && blocksRemaining > 0 ? (
                          <>
                            Roughly{" "}
                            <span className="font-semibold text-foreground">
                              {formatBlocksAsDuration(blocksRemaining)}
                            </span>{" "}
                            remaining, estimated from ~10 minute blocks. Your STX is committed to
                            Dual Stacking until then, so it can&apos;t be released early.
                          </>
                        ) : (
                          "Your STX is committed to Dual Stacking until the lock ends."
                        )}
                      </span>
                    </p>
                  )}
                </div>
              ) : hasPendingWithdrawal ? (
                <div className="mt-6 rounded-xl border border-border bg-surface-muted p-5">
                  <StatTile
                    label="STX unlocking"
                    value={`${(Number(pendingWithdrawal.amount) / 1_000_000).toLocaleString()}`}
                    hint="no longer earning a boost"
                  />

                  {isClaimable ? (
                    <div className="mt-5">
                      <Status text="Your withdrawal cooldown is over - claim it to get your STX back." kind="success" />
                      <div className="mt-3">
                        <Button
                          full
                          loading={busy === "claim-unlock"}
                          onClick={handleClaimUnlock}
                          icon={<CheckIcon size={16} />}
                        >
                          {busy === "claim-unlock" ? "Claiming" : "Claim my STX"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 flex items-start gap-2.5 rounded-lg bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
                      <ClockIcon size={14} className="mt-px shrink-0" />
                      <span>
                        {blocksUntilClaimable !== null && blocksUntilClaimable > 0 ? (
                          <>
                            Roughly{" "}
                            <span className="font-semibold text-foreground">
                              {formatBlocksAsDuration(blocksUntilClaimable)}
                            </span>{" "}
                            until this is claimable - this is StackingDAO&apos;s own withdrawal
                            cooldown, separate from and in addition to the lock duration you chose.
                          </>
                        ) : (
                          "Waiting on StackingDAO's own withdrawal cooldown before this can be claimed."
                        )}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                loaded && (
                  <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-muted p-5 text-center">
                    <p className="text-sm font-medium text-foreground">No STX locked yet</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      You&apos;re still earning the full base yield. Lock STX to raise that rate.
                    </p>
                  </div>
                )
              )}
            </Card>

            {/* ── Lock configurator ── */}
            {blocksNewLock ? (
              <Card
                title="One position at a time"
                subtitle={
                  isLocked
                    ? "You already have STX locked. Once this lock ends and you've claimed it back, you can start a new one."
                    : "You have STX still unlocking. Claim it first, then you can start a new lock."
                }
                icon={<LockIcon size={16} />}
              >
                <Link href="/app">
                  <Button full variant="secondary" arrow>
                    Back to dashboard
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card
                title="Lock STX to boost"
                subtitle="Choose how much to lock and for how long. The longer and larger the lock, the bigger the boost."
                icon={<LockIcon size={16} />}
              >
                <div className="flex flex-col gap-6">
                  <AmountInput
                    label="Amount to lock"
                    value={lockAmount}
                    onChange={setLockAmount}
                    placeholder="0"
                    unit="STX"
                  />

                  <SegmentedOptions
                    label="Lock duration"
                    value={lockPresetLabel}
                    onChange={setLockPresetLabel}
                    options={LOCK_DURATION_PRESETS.map((p) => {
                      const [main, note] = p.label.split(" (");
                      return {
                        value: p.label,
                        label: main,
                        sublabel: note ? note.replace(")", "") : undefined,
                      };
                    })}
                  />

                  {/* Plain-language summary of exactly what's about to happen. */}
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      What you&apos;re agreeing to
                    </p>
                    <ul className="mt-3 flex flex-col gap-2.5 text-xs leading-relaxed text-foreground-soft">
                      <li className="flex gap-2.5">
                        <LockIcon size={13} className="mt-0.5 shrink-0 text-brand" />
                        <span>
                          <span className="num font-semibold text-foreground">
                            {lockAmount || "0"} STX
                          </span>{" "}
                          locked for{" "}
                          <span className="font-semibold text-foreground">
                            {formatBlocksAsDuration(selectedPreset.blocks)}
                          </span>
                          .
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <ClockIcon size={13} className="mt-0.5 shrink-0 text-brand" />
                        <span>
                          It <span className="font-semibold text-foreground">cannot</span> be
                          withdrawn early: your STX is committed to Dual Stacking for whole reward
                          cycles, and the boost is sized by how long you commit.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <ClockIcon size={13} className="mt-0.5 shrink-0 text-brand" />
                        <span>
                          Getting your STX back after that is two steps, not one: starting the
                          unlock, then a{" "}
                          <span className="font-semibold text-foreground">further ~2 week</span>{" "}
                          withdrawal cooldown - StackingDAO&apos;s own, on top of the lock duration
                          above - before it&apos;s claimable.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <CheckIcon size={13} className="mt-0.5 shrink-0 text-success" />
                        <span>
                          You get the full amount back once claimed. The boost itself is paid
                          onto your balance in sBTC.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    full
                    size="lg"
                    loading={busy === "lock"}
                    disabled={!lockAmount}
                    onClick={handleLock}
                    icon={<BoostIcon size={16} />}
                  >
                    {busy === "lock" ? "Locking" : "Lock STX to boost"}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {message && <Status {...message} />}

          <HistoryPanel
            title="Lock activity"
            subtitle="Your own lock and unlock actions on ve-stx-lock - not a per-epoch payout ledger. Your lifetime sBTC earned from boosting is on the dashboard."
            entries={history}
            describe={describeLockHistory}
            emptyText="No lock activity yet."
          />
        </div>
      )}
    </AppShell>
  );
}
