// Thin wrappers around bitmax-vault / ve-stx-lock contract calls, kept
// separate from the UI so components stay focused on presentation.

import { Cl, fetchCallReadOnlyFunction, type ClarityValue } from "@stacks/transactions";
import { CONTRACT_DEPLOYER, CONTRACTS, NETWORK, NETWORK_NAME } from "./network";
import { submitSponsored } from "./sponsor";

function contract(name: string): `${string}.${string}` {
  return `${CONTRACT_DEPLOYER}.${name}` as `${string}.${string}`;
}

function readUint(cv: ClarityValue): bigint {
  if (cv.type !== "uint") {
    throw new Error(`expected a uint clarity value, got "${cv.type}"`);
  }
  return BigInt(cv.value);
}

// --- StackingDAO's real mainnet contracts --------------------------------
//
// bitmax-vault.clar calls these directly now (see that contract's own
// header for the full reasoning) - real, live, confirmed against
// StackingDAO's own deployed source, not guessed. This makes the vault
// mainnet-only by construction: a devnet/testnet transaction can never
// reach a mainnet contract, so every vault write below only works once
// NETWORK_NAME is "mainnet" - gated the same way ZEST_AVAILABLE already
// gates the Borrow page.
const STACKINGDAO_STBTC_CORE_MAINNET =
  "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-stbtc-v1";
const STACKINGDAO_STBTC_DATA_MAINNET = "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.data-stbtc-v1";
const STACKINGDAO_STBTC_WITHDRAW_DATA_MAINNET =
  "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.withdraw-data-stbtc";

// StackingDAO's real Dual Stacking product - what ve-stx-lock.clar calls
// directly now (see that contract's own header). Same mainnet-only
// constraint as the stBTC leg above: a relative `.foo` contract-call can
// only ever resolve within the same deployer, so there's no
// environment-conditional devnet path here either.
const STACKINGDAO_STSTXBTC_CORE_MAINNET =
  "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-ststxbtc-v2";
const STACKINGDAO_STSTXBTC_DATA_MAINNET =
  "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststxbtc-data-v2";
const STACKINGDAO_STSTXBTC_TRACKING_MAINNET =
  "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststxbtc-tracking-v2";

export const VAULT_AVAILABLE = NETWORK_NAME === "mainnet";
// ve-stx-lock's Dual Stacking leg is a separate real StackingDAO contract
// from the vault's stBTC leg, but gated by the exact same constraint -
// kept as its own export so call sites read as "what needs mainnet" per
// feature, not because the underlying check differs today.
export const LOCK_AVAILABLE = NETWORK_NAME === "mainnet";

function requireVaultAvailable() {
  if (!VAULT_AVAILABLE) {
    throw new Error(
      "The vault talks directly to StackingDAO's real mainnet contracts, so it only works once this app is live on Stacks mainnet."
    );
  }
}

function requireLockAvailable() {
  if (!LOCK_AVAILABLE) {
    throw new Error(
      "Locking talks directly to StackingDAO's real mainnet Dual Stacking contracts, so it only works once this app is live on Stacks mainnet."
    );
  }
}

// StackingDAO's own exchange-rate reads are scaled to 8 decimals (their
// own DENOMINATOR_8 constant) - matches sBTC/stBTC's own decimals.
const RATIO_DENOMINATOR = 100_000_000n;

async function readStackingDaoRatio(functionName: "get-sbtc-per-stbtc" | "get-sbtc-per-stbtc-up") {
  const [contractAddress, contractName] = STACKINGDAO_STBTC_DATA_MAINNET.split(".");
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [],
    senderAddress: CONTRACT_DEPLOYER,
    network: NETWORK,
  });
  return readUint(cv);
}

// --- writes (wallet-signed) ---------------------------------------------

/**
 * Deposits `amountSats` real sBTC, staking it via StackingDAO's real
 * stacking-dao-core-stbtc-v1. min-stbtc-out is computed here from a live
 * read of StackingDAO's own exchange rate (the "up" variant - the same
 * rounding direction their own deposit function uses internally), 1%
 * under the expected mint, rather than assuming 1:1 - see bitmax-vault.clar's
 * deposit for why that assumption would be wrong.
 */
export async function depositSbtc(amountSats: bigint) {
  requireVaultAvailable();
  const ratio = await readStackingDaoRatio("get-sbtc-per-stbtc-up");
  const expectedStbtc = (amountSats * RATIO_DENOMINATOR) / ratio;
  const minStbtcOut = (expectedStbtc * 99n) / 100n;
  return submitSponsored({
    contract: contract(CONTRACTS.vault),
    functionName: "deposit",
    functionArgs: [
      Cl.uint(amountSats),
      Cl.uint(minStbtcOut),
      Cl.principal(STBTC_SBTC_TOKEN_MAINNET.sbtc),
      Cl.principal(STACKINGDAO_STBTC_CORE_MAINNET),
    ],
  });
}

export async function redeemStbtc(stbtcAmountSats: bigint) {
  requireVaultAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.vault),
    functionName: "redeem",
    functionArgs: [Cl.uint(stbtcAmountSats), Cl.principal(STBTC_SBTC_TOKEN_MAINNET.stbtc)],
  });
}

// Redeeming all the way back to sBTC is two real steps, not one - see
// bitmax-vault.clar's header for why (it mirrors StackingDAO's own real
// withdrawal cooldown, which isn't instant, the same pattern
// ve-stx-lock.clar's request-unlock/claim-unlock already uses).
export async function requestRedeemToSbtc(stbtcAmountSats: bigint) {
  requireVaultAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.vault),
    functionName: "request-redeem-to-sbtc",
    functionArgs: [Cl.uint(stbtcAmountSats), Cl.principal(STACKINGDAO_STBTC_CORE_MAINNET)],
  });
}

export async function claimRedeemToSbtc() {
  requireVaultAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.vault),
    functionName: "claim-redeem-to-sbtc",
    functionArgs: [
      Cl.principal(STACKINGDAO_STBTC_CORE_MAINNET),
      Cl.principal(STBTC_SBTC_TOKEN_MAINNET.sbtc),
    ],
  });
}

/**
 * Locks `amountUstx` STX until `unlockHeight`, pooling it into StackingDAO's
 * real Dual Stacking contract (stacking-dao-core-ststxbtc-v2) via
 * ve-stx-lock.clar. No slippage/min-out param is needed here (unlike
 * depositSbtc) - stSTXbtc mints strictly 1:1 with STX, see
 * ve-stx-lock.clar's header.
 */
export async function lockStx(amountUstx: bigint, unlockHeight: bigint) {
  requireLockAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.veLock),
    functionName: "lock-stx",
    functionArgs: [
      Cl.uint(amountUstx),
      Cl.uint(unlockHeight),
      Cl.principal(STACKINGDAO_STSTXBTC_CORE_MAINNET),
    ],
  });
}

// Exiting a lock is two real steps, not one - see ve-stx-lock.clar's header
// for why (it mirrors StackingDAO's own real withdrawal cooldown, which
// isn't instant). requestUnlock is callable once the chosen lock duration
// has passed; it clears the lock and starts a *second*, separate cooldown.
// claimUnlock only succeeds once that second cooldown has also passed.
export async function requestUnlock() {
  requireLockAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.veLock),
    functionName: "request-unlock",
    functionArgs: [Cl.principal(STACKINGDAO_STSTXBTC_CORE_MAINNET)],
  });
}

export async function claimUnlock() {
  requireLockAvailable();
  return submitSponsored({
    contract: contract(CONTRACTS.veLock),
    functionName: "claim-unlock",
    functionArgs: [Cl.principal(STACKINGDAO_STSTXBTC_CORE_MAINNET)],
  });
}

export async function registerForBoost() {
  return submitSponsored({
    contract: contract(CONTRACTS.distributor),
    functionName: "register",
    functionArgs: [],
  });
}

// --- reads (no wallet interaction) --------------------------------------

/**
 * Live sBTC-equivalent value of the caller's real stBTC entitlement.
 * bitmax-vault.clar's own get-balance returns the raw stBTC amount only
 * (Clarity's read-only functions can't make the external call needed to
 * read StackingDAO's own live exchange rate - see that contract's
 * get-balance for why) - this combines that on-chain read with a direct,
 * separate read of StackingDAO's real, currently-live rate and multiplies
 * client-side, the same two-reads-combined pattern lib/zest.ts's borrow
 * estimate already uses. This is what grows automatically as real Bitcoin
 * Staking rewards accrue, with no explicit "credit yield" step needed.
 */
export async function getVaultBalance(address: string): Promise<bigint> {
  const stbtcOwned = await getVaultStbtcOwned(address);
  if (!VAULT_AVAILABLE || stbtcOwned === 0n) return stbtcOwned;
  const ratio = await readStackingDaoRatio("get-sbtc-per-stbtc");
  return (stbtcOwned * ratio) / RATIO_DENOMINATOR;
}

/** The caller's real stBTC entitlement, in raw stBTC terms - not converted to an sBTC-equivalent value. */
export async function getVaultStbtcOwned(address: string): Promise<bigint> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.vault,
    functionName: "get-balance",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  return readUint(cv);
}

/** How much of getVaultBalance is still "money put in" - see bitmax-vault.clar's get-principal. */
export async function getVaultPrincipal(address: string): Promise<bigint> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.vault,
    functionName: "get-principal",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  return readUint(cv);
}

export async function getLockWeight(address: string): Promise<bigint> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.veLock,
    functionName: "get-weight",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  return readUint(cv);
}

/**
 * Total sBTC this address has ever been paid by the boost, across every
 * epoch - not a snapshot of their current wallet balance. sBTC is
 * fungible, so once a boost payout lands in a wallet it's indistinguishable
 * from any other sBTC the user holds or later spends; bitmax-boost-
 * distributor.clar tracks this separately (lifetime-boost-paid) for exactly
 * that reason. This is what "sBTC earned from your STX lock" on the
 * dashboard actually reads.
 */
export async function getLifetimeBoostPaid(address: string): Promise<bigint> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.distributor,
    functionName: "get-lifetime-boost-paid",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  return readUint(cv);
}

// The two real SIP-010 tokens that move through the vault. On mainnet
// these are the real deployed contracts (confirmed against each
// protocol's own source, not guessed); on devnet/testnet there's no such
// deployment reachable here, so balance reads fall back to local mocks
// for UI-development convenience (the vault's own writes are mainnet-only
// regardless - see VAULT_AVAILABLE above - so a devnet balance here would
// only ever reflect sBTC/stBTC minted directly against the mock for
// testing, never anything the vault itself produced).
const STBTC_SBTC_TOKEN_MAINNET = {
  sbtc: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
  stbtc: "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token",
};

export async function getSbtcBalance(address: string): Promise<bigint> {
  const [contractAddress, contractName] =
    NETWORK_NAME === "mainnet"
      ? STBTC_SBTC_TOKEN_MAINNET.sbtc.split(".")
      : [CONTRACT_DEPLOYER, "mock-sbtc"];
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-balance",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  if (cv.type !== "ok") {
    throw new Error("could not read sBTC balance");
  }
  return readUint(cv.value);
}

export async function getStbtcBalance(address: string): Promise<bigint> {
  const [contractAddress, contractName] =
    NETWORK_NAME === "mainnet"
      ? STBTC_SBTC_TOKEN_MAINNET.stbtc.split(".")
      : [CONTRACT_DEPLOYER, "mock-stbtc"];
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-balance",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  if (cv.type !== "ok") {
    throw new Error("could not read stBTC balance");
  }
  return readUint(cv.value);
}

/**
 * A redeem-to-sbtc that's been requested but not yet claimable - mirrors
 * getPendingWithdrawal's own shape exactly, chaining into StackingDAO's
 * own withdraw-data-stbtc for the real unlock height rather than caching
 * it locally (see that function's own comment for why).
 */
export async function getPendingSbtcWithdrawal(
  address: string
): Promise<{ claimableAtHeight: bigint } | null> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.vault,
    functionName: "get-pending-sbtc-withdrawal",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  if (cv.type !== "some") return null;
  const tuple = cv.value;
  if (tuple.type !== "tuple") return null;
  const nftId = readUint(tuple.value["nft-id"]);

  const [contractAddress, contractName] = STACKINGDAO_STBTC_WITHDRAW_DATA_MAINNET.split(".");
  const ticketCv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-withdrawals-by-nft",
    functionArgs: [Cl.uint(nftId)],
    senderAddress: address,
    network: NETWORK,
  });
  if (ticketCv.type !== "tuple") return { claimableAtHeight: 0n };
  return { claimableAtHeight: readUint(ticketCv.value["unlock-burn-height"]) };
}

export async function getLock(address: string) {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.veLock,
    functionName: "get-lock",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  if (cv.type !== "some") return null;
  const tuple = cv.value;
  if (tuple.type !== "tuple") return null;
  return {
    amount: readUint(tuple.value.amount),
    unlockHeight: readUint(tuple.value["unlock-height"]),
  };
}

/**
 * A withdrawal that's been requested (past the lock's own unlock-height)
 * but not yet claimable - see ve-stx-lock.clar's header for the two-step
 * exit this models. `claimableAtHeight` comes live from StackingDAO's real
 * ststxbtc-data-v2, not cached in ve-stx-lock's own map - the same
 * live-read-over-stale-cache pattern getPendingSbtcWithdrawal already uses
 * for the vault's stBTC leg.
 */
export async function getPendingWithdrawal(
  address: string
): Promise<{ amount: bigint; claimableAtHeight: bigint } | null> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACTS.veLock,
    functionName: "get-pending-withdrawal",
    functionArgs: [Cl.principal(address)],
    senderAddress: address,
    network: NETWORK,
  });
  if (cv.type !== "some") return null;
  const tuple = cv.value;
  if (tuple.type !== "tuple") return null;
  const amount = readUint(tuple.value.amount);
  const nftId = readUint(tuple.value["nft-id"]);

  const [contractAddress, contractName] = STACKINGDAO_STSTXBTC_DATA_MAINNET.split(".");
  const ticketCv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-withdrawals-by-nft",
    functionArgs: [Cl.uint(nftId)],
    senderAddress: address,
    network: NETWORK,
  });
  if (ticketCv.type !== "tuple") return { amount, claimableAtHeight: 0n };
  return {
    amount,
    claimableAtHeight: readUint(ticketCv.value["unlock-burn-height"]),
  };
}

/**
 * The real sBTC Dual Stacking reward currently pending for ve-stx-lock's
 * pooled stSTXbtc holding - not yet pulled into BitMax by a keeper's
 * close-epoch call. Read directly from StackingDAO's own ststxbtc-tracking-v2
 * (permissionless, read-only) rather than added to ve-stx-lock.clar itself:
 * a Clarity read-only function can't make this external call (same
 * constraint bitmax-vault.clar's get-balance runs into - see that
 * function's own comment).
 */
export async function getPendingBoostReward(): Promise<bigint> {
  if (!LOCK_AVAILABLE) return 0n;
  const veLockPrincipal = contract(CONTRACTS.veLock);
  const [contractAddress, contractName] = STACKINGDAO_STSTXBTC_TRACKING_MAINNET.split(".");
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-pending-rewards",
    functionArgs: [Cl.principal(veLockPrincipal), Cl.principal(veLockPrincipal)],
    senderAddress: CONTRACT_DEPLOYER,
    network: NETWORK,
  });
  if (cv.type !== "ok") return 0n;
  return readUint(cv.value);
}
