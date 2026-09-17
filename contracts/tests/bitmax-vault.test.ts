import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// bitmax-vault.clar now calls StackingDAO's real mainnet contracts
// directly (see that file's own header for the full reasoning) - every
// public function needs a successful external call to do anything useful,
// and simnet can't reach those real contracts (confirmed: the installed
// Clarinet SDK's remote-mainnet-fork feature can't parse their Clarity
// epoch). So unlike the pre-real-integration version of this test file,
// almost nothing here can exercise a full deposit/redeem/claim path -
// that's now verified by direct comparison against StackingDAO's deployed
// source and live mainnet reads instead, the same standard the Zest
// integration was already held to.
//
// What's still genuinely testable locally: every `asserts!` that runs
// BEFORE the trait-principal pin checks (see bitmax-vault.clar - those
// checks were deliberately ordered cheap-local-checks-first specifically
// so this much would stay testable), plus set-boost-distributor's access
// control (no external call at all), plus read-only defaults on an
// untouched map.

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const VAULT = "bitmax-vault";

// A locally-deployed contract that conforms to the right trait shape, but
// is never equal to the real hardcoded mainnet principal - exactly what a
// local test has available, and exactly what the pinned-principal checks
// exist to reject.
const LOCAL_FT_STANDIN = `${deployer}.mock-sbtc`;

describe("bitmax-vault", () => {
  it("rejects a zero-amount deposit before ever checking the trait principals", () => {
    const wallet = wallets[0];
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(0), Cl.uint(0), Cl.principal(LOCAL_FT_STANDIN), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    // Reaches ERR-ZERO-AMOUNT (501), not ERR-WRONG-CONTRACT (506) -
    // confirms the reordering in bitmax-vault.clar actually holds.
    expect(result).toBeErr(Cl.uint(501));
  });

  it("rejects deposit against a contract that isn't the real sBTC/StackingDAO principal", () => {
    const wallet = wallets[0];
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(100), Cl.uint(0), Cl.principal(LOCAL_FT_STANDIN), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(506));
  });

  it("rejects a zero-amount redeem before ever checking the trait principal", () => {
    const wallet = wallets[0];
    const { result } = simnet.callPublicFn(
      VAULT,
      "redeem",
      [Cl.uint(0), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(501));
  });

  it("rejects redeeming more than the caller's (zero, untouched) entitlement", () => {
    const wallet = wallets[1];
    const { result } = simnet.callPublicFn(
      VAULT,
      "redeem",
      [Cl.uint(500), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(502));
  });

  it("rejects request-redeem-to-sbtc with no balance to redeem", () => {
    const wallet = wallets[1];
    const { result } = simnet.callPublicFn(
      VAULT,
      "request-redeem-to-sbtc",
      [Cl.uint(500), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(502));
  });

  it("rejects claim-redeem-to-sbtc with no pending withdrawal", () => {
    const wallet = wallets[2];
    const { result } = simnet.callPublicFn(
      VAULT,
      "claim-redeem-to-sbtc",
      [Cl.principal(LOCAL_FT_STANDIN), Cl.principal(LOCAL_FT_STANDIN)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(505));
  });

  it("get-balance/get-principal default to zero, get-pending-sbtc-withdrawal to none, for an untouched principal", () => {
    const wallet = wallets[2];
    expect(
      simnet.callReadOnlyFn(VAULT, "get-balance", [Cl.principal(wallet)], deployer).result
    ).toBeUint(0);
    expect(
      simnet.callReadOnlyFn(VAULT, "get-principal", [Cl.principal(wallet)], deployer).result
    ).toBeUint(0);
    expect(
      simnet.callReadOnlyFn(VAULT, "get-pending-sbtc-withdrawal", [Cl.principal(wallet)], deployer)
        .result
    ).toBeNone();
  });

  it("set-boost-distributor is owner-only and settable exactly once", () => {
    const notOwner = wallets[0];
    const rejected = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(notOwner)],
      notOwner
    );
    expect(rejected.result).toBeErr(Cl.uint(500));

    const first = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(`${deployer}.bitmax-boost-distributor`)],
      deployer
    );
    expect(first.result).toBeOk(Cl.bool(true));

    const second = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(`${deployer}.bitmax-boost-distributor`)],
      deployer
    );
    expect(second.result).toBeErr(Cl.uint(503));

    expect(simnet.callReadOnlyFn(VAULT, "get-boost-distributor", [], deployer).result).toBeSome(
      Cl.principal(`${deployer}.bitmax-boost-distributor`)
    );
  });
});
