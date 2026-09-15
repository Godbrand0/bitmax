import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const deployer = accounts.get("deployer")!;

const POOL = "mock-ststxbtc-pool";
const MOCK_SBTC = "mock-sbtc";

function deposit(wallet: string, amount: number) {
  return simnet.callPublicFn(POOL, "deposit", [Cl.uint(amount)], wallet);
}

function withdraw(wallet: string, amount: number) {
  return simnet.callPublicFn(POOL, "withdraw", [Cl.uint(amount)], wallet);
}

function pooledStx() {
  return simnet.callReadOnlyFn(POOL, "get-pooled-stx", [], deployer).result;
}

function claimableSbtc() {
  return simnet.callReadOnlyFn(POOL, "get-claimable-sbtc", [], deployer).result;
}

function sbtcBalance(who: string) {
  return (
    simnet.callReadOnlyFn(MOCK_SBTC, "get-balance", [Cl.principal(who)], deployer)
      .result as any
  ).value;
}

describe("mock-ststxbtc-pool", () => {
  it("deposit pulls STX into the pool and tracks the pooled total", () => {
    const { result } = deposit(wallet1, 1_000_000);
    expect(result).toBeOk(Cl.uint(1_000_000));
    expect(pooledStx()).toBeUint(1_000_000);
  });

  it("rejects a zero-amount deposit", () => {
    const { result } = deposit(wallet1, 0);
    expect(result).toBeErr(Cl.uint(800));
  });

  it("pools deposits from multiple callers into one running total", () => {
    deposit(wallet1, 1_000_000);
    deposit(wallet2, 500_000);
    expect(pooledStx()).toBeUint(1_500_000);
  });

  it("withdraw returns STX to the caller and reduces the pooled total", () => {
    deposit(wallet1, 1_000_000);
    const before = simnet.getAssetsMap().get("STX")?.get(wallet1) ?? 0n;

    const { result } = withdraw(wallet1, 400_000);
    expect(result).toBeOk(Cl.bool(true));
    expect(pooledStx()).toBeUint(600_000);

    const after = simnet.getAssetsMap().get("STX")?.get(wallet1) ?? 0n;
    expect(after).toBe((before as bigint) + 400_000n);
  });

  it("rejects withdrawing more than is pooled", () => {
    deposit(wallet1, 1_000_000);
    const { result } = withdraw(wallet1, 2_000_000);
    expect(result).toBeErr(Cl.uint(801));
  });

  it("accrue-yield mints real sBTC into the pool and grows the claimable pot", () => {
    const { result } = simnet.callPublicFn(POOL, "accrue-yield", [Cl.uint(2_500)], deployer);
    expect(result).toBeOk(Cl.bool(true));
    expect(claimableSbtc()).toBeUint(2_500);
    expect(sbtcBalance(`${deployer}.${POOL}`)).toBeUint(2_500);
  });

  it("claim-rewards pays the entire claimable pot to the caller and zeroes it", () => {
    simnet.callPublicFn(POOL, "accrue-yield", [Cl.uint(1_200)], deployer);

    const { result } = simnet.callPublicFn(POOL, "claim-rewards", [], wallet1);
    expect(result).toBeOk(Cl.bool(true));
    expect(claimableSbtc()).toBeUint(0);
    expect(sbtcBalance(wallet1)).toBeUint(1_200);
  });
});
