import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// close-epoch now forwards into ve-stx-lock.claim-boost-reward, which
// calls StackingDAO's real mainnet contracts directly (see ve-stx-lock.clar
// and bitmax-boost-distributor.clar's own headers) - simnet can't reach
// those, so full epoch-claim-and-pay-out coverage isn't possible locally
// any more, the same situation bitmax-vault.clar's real leg already
// accepted. What's still genuinely testable locally: registration,
// timing/access-control guards, and the "skip the claim entirely when
// nobody has locked" branch, which never reaches an external call at all.

const accounts = simnet.getAccounts();
const wallets = [1, 2, 3].map((n) => accounts.get(`wallet_${n}`)!);
const deployer = accounts.get("deployer")!;

const DISTRIBUTOR = "bitmax-boost-distributor";
const LOCAL_STAND_IN = `${deployer}.mock-sbtc`;

function register(wallet: string) {
  return simnet.callPublicFn(DISTRIBUTOR, "register", [], wallet);
}

function closeEpoch(sender: string) {
  return simnet.callPublicFn(
    DISTRIBUTOR,
    "close-epoch",
    [Cl.principal(LOCAL_STAND_IN), Cl.principal(LOCAL_STAND_IN)],
    sender
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
    const list = (participants.result as any).value as any[];
    expect(
      list.filter(
        (p: any) => Cl.serialize(p) === Cl.serialize(Cl.principal(wallet))
      ).length
    ).toBe(1);
  });

  // Nobody in this suite ever locks STX (that needs ve-stx-lock's own real
  // StackingDAO call, unreachable from simnet), so total-weight is always
  // zero here - close-epoch's documented short-circuit for that case never
  // touches the trait-typed sbtc-token/tracking params at all, which is
  // exactly why this branch stays testable with a plain local stand-in.
  it("skips the claim and pays nothing when nobody has an active lock", () => {
    const wallet = wallets[0];
    register(wallet);

    const { result } = closeEpoch(deployer);
    expect(result).toBeOk(Cl.uint(0));

    const stats = simnet.callReadOnlyFn(DISTRIBUTOR, "get-epoch-stats", [], deployer);
    expect(stats.result).toBeTuple({
      "total-weight": Cl.uint(0),
      "total-claimed": Cl.uint(0),
    });
  });

  it("rejects closing a second epoch before EPOCH_LENGTH has passed", () => {
    const first = closeEpoch(deployer);
    expect(first.result).toBeOk(Cl.uint(0));

    const { result } = closeEpoch(deployer);
    expect(result).toBeErr(Cl.uint(700));
  });

  it("allows closing a second epoch once EPOCH_LENGTH burn blocks have passed", () => {
    closeEpoch(deployer);
    simnet.mineEmptyBlocks(144);

    const { result } = closeEpoch(deployer);
    expect(result).toBeOk(Cl.uint(0));
  });

  it("get-lifetime-boost-paid defaults to zero for an untouched principal", () => {
    const wallet = wallets[2];
    expect(
      simnet.callReadOnlyFn(DISTRIBUTOR, "get-lifetime-boost-paid", [Cl.principal(wallet)], deployer)
        .result
    ).toBeUint(0);
  });
});
