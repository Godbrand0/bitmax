import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const VAULT = "bitmax-vault";
const MOCK_SBTC = "mock-sbtc";
const MOCK_STBTC = "mock-stbtc";

function mintSbtc(recipient: string, amount: number) {
  return simnet.callPublicFn(
    MOCK_SBTC,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function sbtcBalance(who: string) {
  return simnet.callReadOnlyFn(
    MOCK_SBTC,
    "get-balance",
    [Cl.principal(who)],
    deployer
  ).result;
}

function stbtcBalance(who: string) {
  return simnet.callReadOnlyFn(
    MOCK_STBTC,
    "get-balance",
    [Cl.principal(who)],
    deployer
  ).result;
}

describe("bitmax-vault", () => {
  it("deposit pulls sBTC, stakes it, and credits the depositor's balance", () => {
    const wallet = wallets[0];
    mintSbtc(wallet, 10_000);

    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(6_000)],
      wallet
    );
    expect(result).toBeOk(Cl.bool(true));

    const balance = simnet.callReadOnlyFn(
      VAULT,
      "get-balance",
      [Cl.principal(wallet)],
      wallet
    );
    expect(balance.result).toBeUint(6_000);

    // sBTC left the depositor's wallet
    expect(sbtcBalance(wallet)).toBeOk(Cl.uint(4_000));
    // the vault holds the resulting stBTC, not the depositor
    expect(stbtcBalance(wallet)).toBeOk(Cl.uint(0));
    expect(stbtcBalance(`${deployer}.${VAULT}`)).toBeOk(Cl.uint(6_000));
  });

  it("rejects a zero-amount deposit", () => {
    const wallet = wallets[1];
    mintSbtc(wallet, 1_000);
    const { result } = simnet.callPublicFn(VAULT, "deposit", [Cl.uint(0)], wallet);
    expect(result).toBeErr(Cl.uint(501));
  });

  it("rejects a deposit larger than the caller's sBTC balance", () => {
    const wallet = wallets[2];
    mintSbtc(wallet, 100);
    const { result } = simnet.callPublicFn(
      VAULT,
      "deposit",
      [Cl.uint(500)],
      wallet
    );
    // insufficient-balance surfaces as the underlying ft-transfer? error (u1)
    expect(result).toBeErr(Cl.uint(1));
  });

  it("redeem moves real stBTC to the caller and reduces their entitlement", () => {
    const wallet = wallets[3];
    mintSbtc(wallet, 10_000);
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(10_000)], wallet);

    const { result } = simnet.callPublicFn(
      VAULT,
      "redeem",
      [Cl.uint(4_000)],
      wallet
    );
    expect(result).toBeOk(Cl.bool(true));

    const balance = simnet.callReadOnlyFn(
      VAULT,
      "get-balance",
      [Cl.principal(wallet)],
      wallet
    );
    expect(balance.result).toBeUint(6_000);
    expect(stbtcBalance(wallet)).toBeOk(Cl.uint(4_000));
  });

  it("rejects redeeming more than the caller's entitlement", () => {
    const wallet = wallets[4];
    mintSbtc(wallet, 1_000);
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(1_000)], wallet);

    const { result } = simnet.callPublicFn(
      VAULT,
      "redeem",
      [Cl.uint(1_001)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(502));
  });

  it("redeem-to-sbtc unstakes and returns real sBTC to the caller", () => {
    const wallet = wallets[5];
    mintSbtc(wallet, 5_000);
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(5_000)], wallet);

    const { result } = simnet.callPublicFn(
      VAULT,
      "redeem-to-sbtc",
      [Cl.uint(5_000)],
      wallet
    );
    expect(result).toBeOk(Cl.bool(true));
    expect(sbtcBalance(wallet)).toBeOk(Cl.uint(5_000));
    expect(stbtcBalance(wallet)).toBeOk(Cl.uint(0));

    const balance = simnet.callReadOnlyFn(
      VAULT,
      "get-balance",
      [Cl.principal(wallet)],
      wallet
    );
    expect(balance.result).toBeUint(0);
  });

  it("rejects increase-balance/decrease-balance from anyone but the boost distributor", () => {
    const wallet = wallets[0];
    const { result } = simnet.callPublicFn(
      VAULT,
      "increase-balance",
      [Cl.principal(wallet), Cl.uint(1)],
      wallet
    );
    expect(result).toBeErr(Cl.uint(500));
  });

  it("get-principal tracks money in, separate from balance", () => {
    const wallet = wallets[6];
    mintSbtc(wallet, 10_000);
    simnet.callPublicFn(VAULT, "deposit", [Cl.uint(10_000)], wallet);

    const principal = simnet.callReadOnlyFn(
      VAULT,
      "get-principal",
      [Cl.principal(wallet)],
      wallet
    );
    expect(principal.result).toBeUint(10_000);

    // a boost credit (simulating what bitmax-boost-distributor does) grows
    // the balance without growing principal - that gap is "yield earned".
    // Also mint the matching real stBTC into the vault (accrue-yield),
    // exactly as the real distributor flow requires - otherwise this
    // credits an internal ledger entry with no real backing, and the
    // later redeem would correctly fail for insufficient real stBTC.
    simnet.callPublicFn(
      "mock-stacking-dao",
      "accrue-yield",
      [Cl.uint(500), Cl.principal(`${deployer}.${VAULT}`)],
      deployer
    );
    simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(deployer)],
      deployer
    );
    simnet.callPublicFn(
      VAULT,
      "increase-balance",
      [Cl.principal(wallet), Cl.uint(500)],
      deployer
    );

    const balanceAfterYield = simnet.callReadOnlyFn(
      VAULT,
      "get-balance",
      [Cl.principal(wallet)],
      wallet
    );
    const principalAfterYield = simnet.callReadOnlyFn(
      VAULT,
      "get-principal",
      [Cl.principal(wallet)],
      wallet
    );
    expect(balanceAfterYield.result).toBeUint(10_500);
    expect(principalAfterYield.result).toBeUint(10_000); // unchanged

    // redeeming draws principal down too, so it never exceeds the balance
    simnet.callPublicFn(VAULT, "redeem", [Cl.uint(10_500)], wallet);
    const principalAfterFullRedeem = simnet.callReadOnlyFn(
      VAULT,
      "get-principal",
      [Cl.principal(wallet)],
      wallet
    );
    expect(principalAfterFullRedeem.result).toBeUint(0);
  });

  it("set-boost-distributor is owner-only and one-shot", () => {
    const notOwner = wallets[1];
    const rejected = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(notOwner)],
      notOwner
    );
    expect(rejected.result).toBeErr(Cl.uint(500));

    const accepted = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(notOwner)],
      deployer
    );
    expect(accepted.result).toBeOk(Cl.bool(true));

    const again = simnet.callPublicFn(
      VAULT,
      "set-boost-distributor",
      [Cl.principal(deployer)],
      deployer
    );
    expect(again.result).toBeErr(Cl.uint(503));
  });
});
