import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
// Each test uses its own wallet so writes in one test can't leak into
// another - simnet state persists across `it` blocks within this file.
const wallets = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => accounts.get(`wallet_${n}`)!);

// ve-stx-lock now counts burn-block-height (Bitcoin blocks), not
// stacks-block-height - see that contract's header for why. simnet advances
// both 1:1 under mineEmptyBlocks (verified: no independent Nakamoto
// multi-stacks-block-per-burn-block simulation here), so these tests could
// use either counter numerically, but burnBlockHeight is used throughout to
// match what the contract itself now reads.

const CONTRACT = "ve-stx-lock";
const MIN_LOCK = 2016;
const MAX_LOCK = 26280;

describe("ve-stx-lock", () => {
  it("locks STX and records the lock", () => {
    const wallet = wallets[0];
    // +2 headroom: the lock-stx call itself mines a block before executing,
    // so the effective duration at execution time is unlockHeight - (height+1).
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    expect(result).toBeOk(Cl.bool(true));

    const lock = simnet.callReadOnlyFn(
      CONTRACT,
      "get-lock",
      [Cl.principal(wallet)],
      wallet
    );
    expect(lock.result).toBeSome(
      Cl.tuple({
        amount: Cl.uint(1000),
        "created-at": Cl.uint(simnet.burnBlockHeight),
        "unlock-height": Cl.uint(unlockHeight),
      })
    );
  });

  it("rejects a zero-amount lock", () => {
    const wallet = wallets[1];
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(0), Cl.uint(unlockHeight)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a lock shorter than MIN_LOCK_DURATION", () => {
    const wallet = wallets[2];
    // well short of MIN_LOCK regardless of the +1 mined block
    const unlockHeight = simnet.burnBlockHeight + 500;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("rejects a lock longer than MAX_LOCK_DURATION", () => {
    const wallet = wallets[3];
    const unlockHeight = simnet.burnBlockHeight + MAX_LOCK + 1000;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(103));
  });

  it("rejects a second lock while one is already active", () => {
    const wallet = wallets[4];
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(500), Cl.uint(unlockHeight)],
      wallet
    );
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(500), Cl.uint(unlockHeight)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(104));
  });

  it("weight decays linearly toward zero and hits zero past unlock height", () => {
    const wallet = wallets[5];
    const lockAmount = MAX_LOCK; // keeps weight math a clean division
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(lockAmount), Cl.uint(unlockHeight)],
      wallet
    );

    const weightAtLock = simnet.callReadOnlyFn(
      CONTRACT,
      "get-weight",
      [Cl.principal(wallet)],
      wallet
    );
    const remaining = unlockHeight - simnet.burnBlockHeight;
    expect(weightAtLock.result).toBeUint(
      Math.floor((lockAmount * remaining) / MAX_LOCK)
    );

    simnet.mineEmptyBlocks(unlockHeight - simnet.burnBlockHeight);

    const weightAfterUnlock = simnet.callReadOnlyFn(
      CONTRACT,
      "get-weight",
      [Cl.principal(wallet)],
      wallet
    );
    expect(weightAfterUnlock.result).toBeUint(0);
  });

  it("rejects request-unlock before unlock height", () => {
    const wallet = wallets[6];
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    const { result } = simnet.callPublicFn(CONTRACT, "request-unlock", [], wallet);
    expect(result).toBeErr(Cl.uint(106));
  });

  it("rejects request-unlock with no active lock", () => {
    // deployer has no lock anywhere in this suite
    const deployer = accounts.get("deployer")!;
    const { result } = simnet.callPublicFn(CONTRACT, "request-unlock", [], deployer);
    expect(result).toBeErr(Cl.uint(105));
  });

  it("rejects claim-unlock with no pending withdrawal", () => {
    const wallet = wallets[7];
    const { result } = simnet.callPublicFn(CONTRACT, "claim-unlock", [], wallet);
    expect(result).toBeErr(Cl.uint(108));
  });

  // Exiting is two real steps with a real gap between them, mirroring
  // StackingDAO's own init-withdraw/withdraw cooldown (see this contract's
  // header) - not simulated as instant. This test walks the whole path:
  // lock -> request-unlock (clears the lock, starts a second cooldown) ->
  // claim-unlock rejected while that cooldown is still running -> accepted
  // once it's passed, with the STX actually landing back in the wallet.
  it("requires request-unlock then a further cooldown before claim-unlock pays out", () => {
    const wallet = wallets[7];
    const lockAmount = 1_000_000;
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;

    const before = simnet.getAssetsMap().get("STX")?.get(wallet) ?? 0n;

    simnet.callPublicFn(CONTRACT, "lock-stx", [Cl.uint(lockAmount), Cl.uint(unlockHeight)], wallet);
    simnet.mineEmptyBlocks(unlockHeight - simnet.burnBlockHeight);

    const requested = simnet.callPublicFn(CONTRACT, "request-unlock", [], wallet);
    expect(requested.result).toBeOk(Cl.uint(0)); // first ticket id issued in this test run

    // The lock is gone, but nothing has been claimed yet.
    const lock = simnet.callReadOnlyFn(CONTRACT, "get-lock", [Cl.principal(wallet)], wallet);
    expect(lock.result).toBeNone();
    const pending = simnet.callReadOnlyFn(
      CONTRACT,
      "get-pending-withdrawal",
      [Cl.principal(wallet)],
      wallet
    );
    expect(pending.result).toBeSome(
      Cl.tuple({ "ticket-id": Cl.uint(0), amount: Cl.uint(lockAmount) })
    );

    // Too early: the pool's own withdrawal cooldown hasn't passed.
    const tooEarly = simnet.callPublicFn(CONTRACT, "claim-unlock", [], wallet);
    expect(tooEarly.result).toBeErr(Cl.uint(804)); // ERR-NOT-YET-UNLOCKED, from the pool

    simnet.mineEmptyBlocks(2016); // mock-ststxbtc-pool's WITHDRAW-COOLDOWN-BLOCKS

    const claimed = simnet.callPublicFn(CONTRACT, "claim-unlock", [], wallet);
    expect(claimed.result).toBeOk(Cl.bool(true));

    const pendingAfter = simnet.callReadOnlyFn(
      CONTRACT,
      "get-pending-withdrawal",
      [Cl.principal(wallet)],
      wallet
    );
    expect(pendingAfter.result).toBeNone();

    // The STX actually moved: net of the lock/claim round trip, the wallet
    // is back where it started (mining blocks costs no STX in simnet).
    const after = simnet.getAssetsMap().get("STX")?.get(wallet) ?? 0n;
    expect(after).toBe(before);
  });

  it("rejects a new lock while a previous withdrawal is still pending", () => {
    const wallet = wallets[3]; // already used earlier in this file, unlocked fresh here
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;

    simnet.callPublicFn(CONTRACT, "lock-stx", [Cl.uint(1000), Cl.uint(unlockHeight)], wallet);
    simnet.mineEmptyBlocks(unlockHeight - simnet.burnBlockHeight);
    simnet.callPublicFn(CONTRACT, "request-unlock", [], wallet);

    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(simnet.burnBlockHeight + MIN_LOCK + 10)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(107));
  });
});
