// Real, direct integration with Zest Protocol's live lending market -
// BitMax constructs and the user's own wallet signs a call straight to
// Zest's contract; there is no BitMax-side contract in this path (see
// readme.md section 1 for why: it avoids ever depending on Zest listing a
// new collateral asset).
//
// Verified against Zest's actual deployed source, not docs summaries:
// github.com/Zest-Protocol/zest-v2-contracts, mainnet/contracts/market/v0-8-market.clar
// and mainnet/contracts/registry/v0-assets.clar (fetched directly, Sept 2026).
//
// IMPORTANT: Zest v2 is a mainnet-only production deployment - there is no
// known devnet/testnet instance. These calls only do anything real when
// NETWORK_NAME is "mainnet"; callers should gate the UI accordingly rather
// than let a user submit a doomed transaction on devnet/testnet.

import { request } from "@stacks/connect";
import { Cl, fetchCallReadOnlyFunction } from "@stacks/transactions";
import { NETWORK, NETWORK_NAME } from "./network";

const ZEST_DEPLOYER = "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7";
const ZEST_MARKET = "v0-8-market" as const;
const ZEST_ASSETS_REGISTRY = "v0-assets" as const;

// Canonical asset ids, read directly from v0-8-market.clar's own constants
// (STX u0, sBTC u2, stSTX u4, USDC u6, USDH u8, stSTXbtc u10, stBTC u12) -
// not guessed, and not the "z"-prefixed vault-share ids which are Zest's
// internal representation, not what a caller passes in.
export const ZEST_ASSET_IDS = {
  stBTC: 12,
  USDC: 6,
} as const;

function zestContract(name: string): `${string}.${string}` {
  return `${ZEST_DEPLOYER}.${name}` as `${string}.${string}`;
}

/**
 * Resolves an asset id to its actual registered SIP-010 contract principal
 * via Zest's own on-chain registry - deliberately not hardcoded, since a
 * wrong guessed token address in a lending-protocol call is exactly the
 * kind of mistake that shouldn't ship.
 */
export async function resolveAssetContract(assetId: number, senderAddress: string): Promise<string> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: ZEST_DEPLOYER,
    contractName: ZEST_ASSETS_REGISTRY,
    functionName: "lookup",
    functionArgs: [Cl.uint(assetId)],
    senderAddress,
    network: NETWORK,
  });
  if (cv.type !== "ok") {
    throw new Error(`Zest asset registry lookup failed for asset id ${assetId}`);
  }
  const inner = cv.value;
  if (inner.type !== "address" && inner.type !== "contract") {
    throw new Error(`unexpected value resolving asset id ${assetId}: ${inner.type}`);
  }
  return inner.value;
}

/** Whether Zest's live market can actually be used from the current network. */
export const ZEST_AVAILABLE = NETWORK_NAME === "mainnet";

/**
 * Supplies `amountSats` of the caller's real stBTC (already redeemed out of
 * bitmax-vault, see lib/vault.ts's `redeem`) as collateral on Zest.
 * `minShares` is slippage protection on the zToken minted internally by
 * Zest - pass a value a little below the expected 1:1 rate.
 *
 * price-feeds is passed as `none`: Zest's own `load-price-feeds` treats
 * that as "use the already-cached on-chain price" (verified in its source
 * - passing `none` returns `(ok { feeds: (list) })`, not an error). That's
 * a deliberate simplification - it relies on the price cache already being
 * reasonably fresh from other Zest activity, rather than this app also
 * integrating Pyth Lazer's off-chain price-update service. Good enough for
 * an MVP; a production integration should push fresh feeds too.
 */
export async function supplyStbtcCollateral(
  amountSats: bigint,
  minShares: bigint,
  senderAddress: string
) {
  const stbtcContract = await resolveAssetContract(ZEST_ASSET_IDS.stBTC, senderAddress);
  return request("stx_callContract", {
    contract: zestContract(ZEST_MARKET),
    functionName: "supply-collateral-add",
    functionArgs: [Cl.principal(stbtcContract), Cl.uint(amountSats), Cl.uint(minShares), Cl.none()],
    network: NETWORK_NAME,
  });
}

/** Borrows `amountUsdc` against whatever collateral the caller already has supplied on Zest. */
export async function borrowUsdc(amountUsdc: bigint, senderAddress: string) {
  const usdcContract = await resolveAssetContract(ZEST_ASSET_IDS.USDC, senderAddress);
  return request("stx_callContract", {
    contract: zestContract(ZEST_MARKET),
    functionName: "borrow",
    functionArgs: [Cl.principal(usdcContract), Cl.uint(amountUsdc), Cl.none(), Cl.none()],
    network: NETWORK_NAME,
  });
}

// --- "how much could I borrow?" estimate ---------------------------------
//
// Zest's own contract has no public read-only for this - the real capacity
// calculation (collateral-add/borrow in v0-8-market.clar) is private and
// needs live Pyth Lazer price feeds plus an egroup-mask-keyed LTV lookup
// that isn't safely reproducible client-side (traced through the actual
// source; there is no `get-max-borrow`-style helper exposed anywhere).
// Rather than skip the feature or fake a number, this computes a clearly
// labeled ESTIMATE from a public BTC/USD price and a conservative fixed
// LTV, and the UI must present it as an estimate, not a guarantee - Zest's
// own contract independently enforces the real limit at borrow time
// regardless of what this shows.

// Conservative placeholder: Zest's own docs cite up to ~70% LTV for sBTC
// and ~50% for other assets; stBTC's specific egroup LTV isn't confirmed,
// so this assumes the more conservative end rather than overstate capacity.
export const ESTIMATED_LTV = 0.5;

export async function getBtcUsdPrice(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
  if (!res.ok) throw new Error("could not fetch a BTC price for the borrow estimate");
  const data = (await res.json()) as { bitcoin: { usd: number } };
  return data.bitcoin.usd;
}

/** stBTC amount (sats) + BTC/USD price -> an estimated USDC borrow limit, in whole USDC. */
export function estimateBorrowableUsdc(stbtcSats: bigint, btcUsdPrice: number): number {
  const stbtcBtc = Number(stbtcSats) / 100_000_000;
  return stbtcBtc * btcUsdPrice * ESTIMATED_LTV;
}
