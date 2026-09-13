import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
// Each test uses its own wallet so writes in one test can't leak into
// another - simnet state persists across `it` blocks within this file.
const wallets = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => accounts.get(`wallet_${n}`)!);

const CONTRACT = "ve-stx-lock";
const MIN_LOCK = 2016;
const MAX_LOCK = 105120;

describe("ve-stx-lock", () => {
  it("locks STX and records the lock", () => {
    const wallet = wallets[0];
    // +2 headroom: the lock-stx call itself mines a block before executing,
    // so the effective duration at execution time is unlockHeight - (height+1).
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
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
        "created-at": Cl.uint(simnet.blockHeight),
        "unlock-height": Cl.uint(unlockHeight),
      })
    );
  });

  it("rejects a zero-amount lock", () => {
    const wallet = wallets[1];
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
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
    const unlockHeight = simnet.blockHeight + 500;
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
    const unlockHeight = simnet.blockHeight + MAX_LOCK + 1000;
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
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
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
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
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
    const remaining = unlockHeight - simnet.blockHeight;
    expect(weightAtLock.result).toBeUint(
      Math.floor((lockAmount * remaining) / MAX_LOCK)
    );

    simnet.mineEmptyBlocks(unlockHeight - simnet.blockHeight);

    const weightAfterUnlock = simnet.callReadOnlyFn(
      CONTRACT,
      "get-weight",
      [Cl.principal(wallet)],
      wallet
    );
    expect(weightAfterUnlock.result).toBeUint(0);
  });

  it("rejects unlock-stx before unlock height", () => {
    const wallet = wallets[6];
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
    simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    const { result } = simnet.callPublicFn(CONTRACT, "unlock-stx", [], wallet);
    expect(result).toBeErr(Cl.uint(106));
  });

  it("allows unlock-stx after unlock height and clears the lock", () => {
    const wallet = wallets[7];
    const unlockHeight = simnet.blockHeight + MIN_LOCK + 10;
    simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight)],
      wallet
    );
    simnet.mineEmptyBlocks(unlockHeight - simnet.blockHeight);

    const { result } = simnet.callPublicFn(CONTRACT, "unlock-stx", [], wallet);
    expect(result).toBeOk(Cl.bool(true));

    const lock = simnet.callReadOnlyFn(
      CONTRACT,
      "get-lock",
      [Cl.principal(wallet)],
      wallet
    );
    expect(lock.result).toBeNone();
  });

  it("rejects unlock-stx with no active lock", () => {
    // deployer has no lock anywhere in this suite
    const deployer = accounts.get("deployer")!;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "unlock-stx",
      [],
      deployer
    );
    expect(result).toBeErr(Cl.uint(105));
  });
});
