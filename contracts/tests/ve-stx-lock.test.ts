import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// ve-stx-lock.clar now calls StackingDAO's real mainnet Dual Stacking
// contracts directly (see that file's own header for the full reasoning) -
// every public function that pools/unpools STX needs a successful external
// call simnet can't reach. So unlike the pre-real-integration version of
// this file, only what runs BEFORE the trait-principal pin check (cheap
// local checks, deliberately ordered first) has local coverage - the rest
// is verified by direct comparison against StackingDAO's deployed source
// and live mainnet reads instead, the same standard bitmax-vault.clar's
// real leg and the Zest integration are already held to.

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3, 4, 5].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const CONTRACT = "ve-stx-lock";
const MIN_LOCK = 2016;
const MAX_LOCK = 26280;

// A locally-deployed contract that conforms to the right trait shape, but
// is never equal to the real hardcoded mainnet principal - exactly what a
// local test has available, and exactly what the pinned-principal checks
// exist to reject. mock-sbtc implements sip-010-trait, which is a superset
// shape-compatible enough for a trait-principal-mismatch test (the check
// only inspects contract-of, never calls the trait's functions here).
const LOCAL_STAND_IN = `${deployer}.mock-sbtc`;

describe("ve-stx-lock", () => {
  it("rejects a zero-amount lock before ever checking the trait principal", () => {
    const wallet = wallets[0];
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(0), Cl.uint(unlockHeight), Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("rejects a lock shorter than MIN_LOCK_DURATION before checking the trait principal", () => {
    const wallet = wallets[1];
    const unlockHeight = simnet.burnBlockHeight + 500;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight), Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("rejects a lock longer than MAX_LOCK_DURATION before checking the trait principal", () => {
    const wallet = wallets[2];
    const unlockHeight = simnet.burnBlockHeight + MAX_LOCK + 1000;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight), Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(103));
  });

  it("rejects a lock against a contract that isn't the real StackingDAO principal", () => {
    const wallet = wallets[3];
    const unlockHeight = simnet.burnBlockHeight + MIN_LOCK + 10;
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "lock-stx",
      [Cl.uint(1000), Cl.uint(unlockHeight), Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(109));
  });

  it("rejects request-unlock with no active lock", () => {
    // deployer has no lock anywhere in this suite
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "request-unlock",
      [Cl.principal(LOCAL_STAND_IN)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(105));
  });

  it("rejects claim-unlock with no pending withdrawal", () => {
    const wallet = wallets[4];
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "claim-unlock",
      [Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(108));
  });

  it("get-lock/get-pending-withdrawal default to none for an untouched principal", () => {
    const wallet = wallets[4];
    expect(
      simnet.callReadOnlyFn(CONTRACT, "get-lock", [Cl.principal(wallet)], deployer).result
    ).toBeNone();
    expect(
      simnet.callReadOnlyFn(CONTRACT, "get-pending-withdrawal", [Cl.principal(wallet)], deployer)
        .result
    ).toBeNone();
  });

  it("get-weight defaults to zero for an untouched principal", () => {
    const wallet = wallets[4];
    expect(
      simnet.callReadOnlyFn(CONTRACT, "get-weight", [Cl.principal(wallet)], deployer).result
    ).toBeUint(0);
  });

  it("claim-boost-reward rejects anyone who isn't the registered boost-distributor", () => {
    const wallet = wallets[0];
    const { result } = simnet.callPublicFn(
      CONTRACT,
      "claim-boost-reward",
      [Cl.principal(LOCAL_STAND_IN), Cl.principal(LOCAL_STAND_IN)],
      wallet
    );
    // boost-distributor is never set in this suite, so this hits the
    // unwrap!-on-none path - same ERR-NOT-AUTHORIZED either way.
    expect(result).toBeErr(Cl.uint(100));
  });

  it("set-boost-distributor is owner-only and settable exactly once", () => {
    const notOwner = wallets[0];
    const rejected = simnet.callPublicFn(
      CONTRACT,
      "set-boost-distributor",
      [Cl.principal(notOwner)],
      notOwner
    );
    expect(rejected.result).toBeErr(Cl.uint(100));

    const first = simnet.callPublicFn(
      CONTRACT,
      "set-boost-distributor",
      [Cl.principal(`${deployer}.bitmax-boost-distributor`)],
      deployer
    );
    expect(first.result).toBeOk(Cl.bool(true));

    const second = simnet.callPublicFn(
      CONTRACT,
      "set-boost-distributor",
      [Cl.principal(`${deployer}.bitmax-boost-distributor`)],
      deployer
    );
    expect(second.result).toBeErr(Cl.uint(110));

    expect(simnet.callReadOnlyFn(CONTRACT, "get-boost-distributor", [], deployer).result).toBeSome(
      Cl.principal(`${deployer}.bitmax-boost-distributor`)
    );
  });
});
