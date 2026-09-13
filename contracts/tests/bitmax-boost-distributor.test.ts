import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3, 4, 5].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const DISTRIBUTOR = "bitmax-boost-distributor";
const VAULT = "bitmax-vault";
const VE_LOCK = "ve-stx-lock";
const MOCK_SBTC = "mock-sbtc";
const MOCK_STACKING_DAO = "mock-stacking-dao";

const MIN_LOCK = 2016;
const EPOCH_LENGTH = 144;

function mintSbtc(recipient: string, amount: number) {
  simnet.callPublicFn(
    MOCK_SBTC,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function deposit(wallet: string, amount: number) {
  simnet.callPublicFn(VAULT, "deposit", [Cl.uint(amount)], wallet);
}

function register(wallet: string) {
  return simnet.callPublicFn(DISTRIBUTOR, "register", [], wallet);
}

function vaultBalance(who: string) {
  return simnet.callReadOnlyFn(
    VAULT,
    "get-balance",
    [Cl.principal(who)],
    deployer
  ).result;
}

function accrueYield(amount: number) {
  // simulate StackingDAO rewards landing in the vault itself, uncredited
  // to any individual depositor - this is exactly the "yield" close-epoch
  // should find and redistribute.
  return simnet.callPublicFn(
    MOCK_STACKING_DAO,
    "accrue-yield",
    [Cl.uint(amount), Cl.principal(`${deployer}.${VAULT}`)],
    deployer
  );
}

// set-boost-distributor is owner-only and one-shot; calling it at the top
// of every test is harmless (later calls just error ERR-ALREADY-SET, which
// is ignored here) and avoids relying on hook/state ordering across tests.
function ensureDistributorWired() {
  simnet.callPublicFn(
    VAULT,
    "set-boost-distributor",
    [Cl.principal(`${deployer}.${DISTRIBUTOR}`)],
    deployer
  );
}

describe("bitmax-boost-distributor", () => {
  it("register adds a participant idempotently", () => {
    const wallet = wallets[0];
    const first = register(wallet);
    expect(first.result).toBeOk(Cl.bool(true));
    const second = register(wallet);
    expect(second.result).toBeOk(Cl.bool(true));

    const participants = simnet.callReadOnlyFn(
      DISTRIBUTOR,
      "get-participants",
      [],
      deployer
    );
    // only counted once despite calling register twice
    const list = (participants.result as any).value as any[];
    expect(
      list.filter(
        (p: any) => Cl.serialize(p) === Cl.serialize(Cl.principal(wallet))
      ).length
    ).toBe(1);
  });

  it("distributes yield flat pro-rata when no one has boosted weight", () => {
    ensureDistributorWired();
    const walletA = wallets[1];
    const walletB = wallets[2];
    mintSbtc(walletA, 6_000);
    mintSbtc(walletB, 4_000);
    deposit(walletA, 6_000);
    deposit(walletB, 4_000);
    register(walletA);
    register(walletB);

    accrueYield(1_000); // total vault stBTC = 10_000 + 1_000, tracked = 10_000

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeOk(Cl.uint(1_000));

    // 60/40 split of the 1000 yield, matching each depositor's balance share
    expect(vaultBalance(walletA)).toBeUint(6_600);
    expect(vaultBalance(walletB)).toBeUint(4_400);
  });

  it("rejects closing a second epoch before EPOCH_LENGTH has passed", () => {
    // Each `it` gets a fresh simnet snapshot, so this needs its own
    // self-contained first close before it can test a second, too-soon one.
    ensureDistributorWired();
    const wallet = wallets[1];
    mintSbtc(wallet, 1_000);
    deposit(wallet, 1_000);
    register(wallet);
    accrueYield(100);

    const first = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(first.result).toBeOk(Cl.uint(100));

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeErr(Cl.uint(700));
  });

  it("gives a boosted (STX-locked) depositor more than flat pro-rata", () => {
    ensureDistributorWired();
    const walletA = wallets[3]; // will lock STX
    const walletB = wallets[4]; // will not

    mintSbtc(walletA, 5_000);
    mintSbtc(walletB, 5_000);
    deposit(walletA, 5_000);
    deposit(walletB, 5_000);
    register(walletA);
    register(walletB);

    simnet.callPublicFn(
      VE_LOCK,
      "lock-stx",
      [Cl.uint(1_000_000), Cl.uint(simnet.blockHeight + MIN_LOCK + 10)],
      walletA
    );

    accrueYield(2_000);

    simnet.mineEmptyBlocks(EPOCH_LENGTH);
    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeOk(Cl.uint(2_000));

    const balanceA = (vaultBalance(walletA) as any).value as bigint;
    const balanceB = (vaultBalance(walletB) as any).value as bigint;

    // equal starting balances and equal starting yield-share, but A locked
    // STX and B didn't - A must now hold strictly more than B.
    expect(balanceA > balanceB).toBe(true);
    // zero-sum modulo integer-division dust: each share is floored, so the
    // credited total can fall a few units short of the real total (never
    // over) - the shortfall just stays uncredited in the vault.
    expect(balanceA + balanceB <= 12_000n).toBe(true);
    expect(balanceA + balanceB >= 11_990n).toBe(true);
  });
});
