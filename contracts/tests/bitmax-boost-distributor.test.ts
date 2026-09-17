import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3, 4, 5].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const DISTRIBUTOR = "bitmax-boost-distributor";
const VE_LOCK = "ve-stx-lock";
const POOL = "mock-ststxbtc-pool";
const MOCK_SBTC = "mock-sbtc";

const MIN_LOCK = 2016;
const EPOCH_LENGTH = 144;

function register(wallet: string) {
  return simnet.callPublicFn(DISTRIBUTOR, "register", [], wallet);
}

// Both ve-stx-lock and bitmax-boost-distributor now count burn-block-height
// (Bitcoin blocks) - see each contract's header. simnet advances
// blockHeight and burnBlockHeight 1:1 under mineEmptyBlocks (no independent
// Nakamoto multi-stacks-block-per-burn-block simulation here), so
// burnBlockHeight is used to match what the contracts themselves read.
function lockStx(wallet: string, amount: number, blocksFromNow: number) {
  return simnet.callPublicFn(
    VE_LOCK,
    "lock-stx",
    [Cl.uint(amount), Cl.uint(simnet.burnBlockHeight + blocksFromNow)],
    wallet
  );
}

function accruePoolYield(amount: number) {
  // simulate the real Dual Stacking BTC reward landing on the pooled STX -
  // the pot close-epoch should find and split among weighted lockers.
  return simnet.callPublicFn(POOL, "accrue-yield", [Cl.uint(amount)], deployer);
}

function sbtcBalance(who: string) {
  return (
    simnet.callReadOnlyFn(MOCK_SBTC, "get-balance", [Cl.principal(who)], deployer)
      .result as any
  ).value;
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
    const list = (participants.result as any).value as any[];
    expect(
      list.filter(
        (p: any) => Cl.serialize(p) === Cl.serialize(Cl.principal(wallet))
      ).length
    ).toBe(1);
  });

  it("pays nothing and records zero when no participant has locked STX", () => {
    const wallet = wallets[0];
    register(wallet);
    accruePoolYield(500);

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeOk(Cl.uint(0));
    expect(sbtcBalance(wallet)).toBeUint(0);
    // pool keeps the unclaimed reward pot since nothing was eligible to claim it
    const pot = simnet.callReadOnlyFn(POOL, "get-claimable-sbtc", [], deployer);
    expect(pot.result).toBeUint(500);
  });

  it("rejects closing a second epoch before EPOCH_LENGTH has passed", () => {
    const wallet = wallets[0];
    register(wallet);
    lockStx(wallet, 1_000_000, MIN_LOCK + 10);
    accruePoolYield(100);

    const first = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(first.result).toBeOk(Cl.uint(100));

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeErr(Cl.uint(700));
  });

  // The test above never mines a block, so it would pass regardless of
  // which clock the contract reads - it only proves "0 blocks elapsed is
  // too soon". This test at least exercises the real EPOCH_LENGTH boundary
  // as a regression guard, though it can't distinguish stacks-block-height
  // from burn-block-height: verified empirically that Clarinet's simnet
  // advances both 1:1 under mineEmptyBlocks (no independent Nakamoto
  // multi-stacks-block-per-burn-block simulation here), so this test
  // passes the same way whichever clock is wired up - the two only diverge
  // on a real network. Confidence that burn-block-height is in fact the
  // wired-up clock comes from reading the contract source, not from this
  // test discriminating between the two.
  it("allows closing a second epoch once EPOCH_LENGTH burn blocks have passed", () => {
    const wallet = wallets[4];
    register(wallet);
    lockStx(wallet, 1_000_000, MIN_LOCK + EPOCH_LENGTH + 10);
    accruePoolYield(100);

    const first = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(first.result).toBeOk(Cl.uint(100));

    simnet.mineEmptyBlocks(EPOCH_LENGTH);
    accruePoolYield(50);

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeOk(Cl.uint(50));
  });

  it("splits the claimed reward purely by locked-STX weight, excluding unlocked participants", () => {
    const walletA = wallets[1]; // locks STX
    const walletB = wallets[2]; // locks STX (smaller)
    const walletC = wallets[3]; // registered but never locks

    register(walletA);
    register(walletB);
    register(walletC);

    lockStx(walletA, 2_000_000, MIN_LOCK + 10);
    lockStx(walletB, 1_000_000, MIN_LOCK + 10);

    accruePoolYield(3_000);

    const { result } = simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);
    expect(result).toBeOk(Cl.uint(3_000));

    const balanceA = (sbtcBalance(walletA) as any).value as bigint;
    const balanceB = (sbtcBalance(walletB) as any).value as bigint;
    const balanceC = (sbtcBalance(walletC) as any).value as bigint;

    // A locked exactly 2x B's STX for the same duration -> exactly 2x weight
    // -> roughly 2x B's share (2000 vs 1000 of the 3000 pot).
    expect(balanceA).toBeGreaterThan(balanceB);
    expect(balanceC).toBe(0n);
    // zero-sum modulo integer-division dust: floored shares can fall a
    // few units short of the claimed total, never over.
    expect(balanceA + balanceB <= 3_000n).toBe(true);
    expect(balanceA + balanceB >= 2_990n).toBe(true);

    // Fresh wallets, one epoch in: lifetime-paid matches the actual balance
    // exactly here. The next test is what actually proves the two can
    // diverge once the user spends the sBTC.
    const lifetimeA = simnet.callReadOnlyFn(
      DISTRIBUTOR,
      "get-lifetime-boost-paid",
      [Cl.principal(walletA)],
      deployer
    );
    expect(lifetimeA.result).toBeUint(balanceA);

    // pool's reward pot is fully drained once claimed
    const pot = simnet.callReadOnlyFn(POOL, "get-claimable-sbtc", [], deployer);
    expect(pot.result).toBeUint(0);
  });

  // The actual reason get-lifetime-boost-paid exists: sBTC is fungible, so
  // once it lands in a wallet, a balance read alone can no longer tell you
  // how much of it the boost paid versus anything else. This proves the
  // tracker survives that - it keeps growing across epochs even after the
  // wallet's own sBTC balance is spent down to zero in between.
  it("tracks lifetime boost paid independently of the wallet spending it", () => {
    const wallet = wallets[0];
    const other = accounts.get("wallet_6")!;

    register(wallet);
    lockStx(wallet, 1_000_000, MIN_LOCK + EPOCH_LENGTH * 2 + 10);

    accruePoolYield(1_000);
    simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);

    const afterFirst = simnet.callReadOnlyFn(
      DISTRIBUTOR,
      "get-lifetime-boost-paid",
      [Cl.principal(wallet)],
      deployer
    );
    expect(afterFirst.result).toBeUint(1_000);

    // Spend it all away - balance goes to zero, but the boost still paid it.
    simnet.callPublicFn(
      MOCK_SBTC,
      "transfer",
      [Cl.uint(1_000), Cl.principal(wallet), Cl.principal(other), Cl.none()],
      wallet
    );
    expect(sbtcBalance(wallet)).toBeUint(0);

    simnet.mineEmptyBlocks(EPOCH_LENGTH);
    accruePoolYield(500);
    simnet.callPublicFn(DISTRIBUTOR, "close-epoch", [], deployer);

    // Balance reflects only the second payout (500) - but lifetime-paid
    // correctly shows the running total across both epochs (1500), proving
    // it's tracked independently of what happened to the first payout.
    expect(sbtcBalance(wallet)).toBeUint(500);
    const afterSecond = simnet.callReadOnlyFn(
      DISTRIBUTOR,
      "get-lifetime-boost-paid",
      [Cl.principal(wallet)],
      deployer
    );
    expect(afterSecond.result).toBeUint(1_500);
  });
});
