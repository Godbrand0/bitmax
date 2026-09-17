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

import { Cl, fetchCallReadOnlyFunction } from "@stacks/transactions";
import { NETWORK, NETWORK_NAME } from "./network";
import { submitSponsored } from "./sponsor";

// Exported so callers building their own reads against this exact contract
// (e.g. the Borrow page's transaction-history panel) share one source of
// truth for the address rather than duplicating the literal.
export const ZEST_DEPLOYER = "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7";
export const ZEST_MARKET = "v0-8-market" as const;
const ZEST_ASSETS_REGISTRY = "v0-assets" as const;
const ZEST_MARKET_VAULT = "v0-market-vault" as const;
const ZEST_STBTC_ZTOKEN_VAULT = "v0-vault-stbtc" as const;

// Canonical asset ids, read directly from v0-8-market.clar's own constants
// (STX u0, sBTC u2, stSTX u4, USDC u6, USDH u8, stSTXbtc u10, stBTC u12) -
// not guessed, and not the "z"-prefixed vault-share ids which are Zest's
// internal representation, not what a caller passes in.
//
// Note: id 6's real token is USDCx (SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx),
// confirmed via that contract's own get-symbol - not the plain USDC its
// asset-id constant name suggests. Kept as `USDC` below only because that's
// Zest's own constant name for this id; every user-facing string elsewhere
// in this app says USDCx.
export const ZEST_ASSET_IDS = {
  stBTC: 12,
  USDC: 6,
} as const;

// The "z"-prefixed id is what collateral is actually *stored* under -
// supply-collateral-add wraps raw stBTC into zstBTC shares via
// v0-vault-stbtc before calling collateral-add, so a user's on-chain
// collateral position is keyed by this id, not stBTC's own id 12.
const ZEST_ZSTBTC_ASSET_ID = 13;

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
  return submitSponsored({
    contract: zestContract(ZEST_MARKET),
    functionName: "supply-collateral-add",
    functionArgs: [Cl.principal(stbtcContract), Cl.uint(amountSats), Cl.uint(minShares), Cl.none()],
  });
}

/** Borrows `amountUsdc` (in USDCx - see ZEST_ASSET_IDS's note) against whatever collateral the caller already has supplied on Zest. */
export async function borrowUsdc(amountUsdc: bigint, senderAddress: string) {
  const usdcContract = await resolveAssetContract(ZEST_ASSET_IDS.USDC, senderAddress);
  return submitSponsored({
    contract: zestContract(ZEST_MARKET),
    functionName: "borrow",
    functionArgs: [Cl.principal(usdcContract), Cl.uint(amountUsdc), Cl.none(), Cl.none()],
  });
}

/**
 * Repays `amountUsdc` of the caller's own outstanding USDCx debt on Zest.
 * Safe to overpay: traced through `repay` in `v0-8-market.clar` - it caps
 * the actual pull to `min(amount, real outstanding debt)` before ever
 * calling the SIP-010 transfer, so passing more than is owed just repays
 * everything owed, never more. That's what makes a "repay my full wallet
 * balance" shortcut safe without first knowing the exact debt (see below
 * for why that exact figure isn't reliably readable anyway).
 */
export async function repayUsdc(amountUsdc: bigint, senderAddress: string) {
  const usdcContract = await resolveAssetContract(ZEST_ASSET_IDS.USDC, senderAddress);
  return submitSponsored({
    contract: zestContract(ZEST_MARKET),
    functionName: "repay",
    functionArgs: [Cl.principal(usdcContract), Cl.uint(amountUsdc), Cl.none()],
  });
}

/**
 * Removes `amountStbtc` (in real, underlying stBTC terms) of the caller's
 * supplied collateral from Zest, redeeming it straight back to a plain
 * stBTC balance in their own wallet - not the zstBTC vault-share token
 * collateral is actually stored as (see getSuppliedStbtc's header comment
 * for why collateral is keyed under asset id 13, not stBTC's own id 12).
 *
 * Uses `collateral-remove-redeem` rather than plain `collateral-remove`:
 * traced through the source, the plain version would leave the caller
 * holding zstBTC shares needing a separate v0-vault-stbtc.redeem call to
 * become spendable stBTC - collateral-remove-redeem does both steps
 * (`collateral-remove` then `vault-redeem`) in one transaction.
 *
 * Zest's own health check inside collateral-remove(-redeem) will reject
 * this if it would leave an existing loan undercollateralized - callers
 * with outstanding debt need to repay first (or partially) rather than
 * this function pre-computing a "safe" amount itself.
 */
export async function removeStbtcCollateral(amountStbtc: bigint, senderAddress: string) {
  const sharesCv = await fetchCallReadOnlyFunction({
    contractAddress: ZEST_DEPLOYER,
    contractName: ZEST_STBTC_ZTOKEN_VAULT,
    functionName: "convert-to-shares",
    functionArgs: [Cl.uint(amountStbtc)],
    senderAddress,
    network: NETWORK,
  });
  if (sharesCv.type !== "ok") {
    throw new Error("could not resolve a share amount for this withdrawal");
  }
  const sharesInner = sharesCv.value;
  if (sharesInner.type !== "uint") {
    throw new Error("unexpected response converting stBTC to shares");
  }
  const shares = BigInt(sharesInner.value);

  // 1% slippage tolerance on the underlying stBTC actually redeemed out,
  // matching the same convention supplyStbtcCollateral uses for min-shares.
  const minUnderlying = (amountStbtc * 99n) / 100n;

  return submitSponsored({
    contract: zestContract(ZEST_MARKET),
    functionName: "collateral-remove-redeem",
    functionArgs: [
      Cl.principal(zestContract(ZEST_STBTC_ZTOKEN_VAULT)),
      Cl.uint(shares),
      Cl.uint(minUnderlying),
      Cl.none(),
      Cl.none(),
    ],
  });
}

/** The caller's real USDCx wallet balance - resolved via Zest's own registry, not hardcoded. */
export async function getUsdcBalance(account: string): Promise<bigint> {
  const usdcContract = await resolveAssetContract(ZEST_ASSET_IDS.USDC, account);
  const [contractAddress, contractName] = usdcContract.split(".");
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: "get-balance",
    functionArgs: [Cl.principal(account)],
    senderAddress: account,
    network: NETWORK,
  });
  if (cv.type !== "ok") return 0n;
  const inner = cv.value;
  if (inner.type !== "uint") return 0n;
  return BigInt(inner.value);
}

/**
 * Whether the caller currently has any outstanding USDCx debt on Zest at
 * all - a real, always-safe read (`debt-scaled` defaults to 0 rather than
 * panicking on a missing entry, unlike `get-collateral`). Deliberately
 * NOT converted to an exact USDCx amount: that conversion needs the current
 * borrow index, which v0-8-market only caches when some other transaction
 * has already triggered accrual in the same block (`get-cached-indexes` is
 * keyed by the current block, and nothing refreshes it on a passive read)
 * - reading it cold would silently show a stale, wrong number most of the
 * time rather than an honest one.
 */
export async function hasOutstandingUsdcDebt(account: string): Promise<boolean> {
  const accountId = await getZestAccountId(account, account);
  if (accountId === null) return false;
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: ZEST_DEPLOYER,
    contractName: ZEST_MARKET_VAULT,
    functionName: "debt-scaled",
    functionArgs: [Cl.uint(accountId), Cl.uint(ZEST_ASSET_IDS.USDC)],
    senderAddress: account,
    network: NETWORK,
  });
  return cv.type === "uint" && BigInt(cv.value) > 0n;
}

// --- "how much could I borrow?" estimate ---------------------------------
//
// Zest's own contract has no public read-only for the exact capacity
// calculation (collateral-add/borrow in v0-8-market.clar) - it's private
// and needs live Pyth Lazer price feeds, which this app doesn't push. But
// the LTV itself IS a real on-chain read (v0-egroup.resolve), so only the
// price side of this estimate is approximated - the LTV is not.
//
// This computes a clearly labeled ESTIMATE from a public BTC/USD price and
// the real, currently-live LTV-BORROW for a stBTC-only position, and the UI
// must present it as an estimate, not a guarantee - Zest's own contract
// independently enforces the real limit (using its own live price feed) at
// borrow time regardless of what this shows.

const ZEST_EGROUP = "v0-egroup" as const;
// bit 13 - the zstBTC asset id (see ZEST_ZSTBTC_ASSET_ID above). A mask of
// exactly this one bit is the egroup for "stBTC is the only collateral
// posted", which is the only position shape the Borrow page ever creates.
const ZSTBTC_ONLY_EGROUP_MASK = 1 << 13;

// Fallback used only if the live v0-egroup read fails (e.g. network blip) -
// deliberately the conservative end of what Zest's own docs cite (~70% LTV
// for sBTC, ~50% for other assets) rather than overstate capacity when the
// real number can't be reached.
const FALLBACK_LTV = 0.5;

/**
 * Reads stBTC's real LTV-BORROW straight from Zest's own v0-egroup contract
 * (confirmed live on mainnet: 8000 bps = 80%, as of this writing) rather
 * than assume a placeholder. LTV-BORROW comes back as a big-endian buff
 * scaled to Zest's BPS constant (10000) - stacks.js represents a BufferCV's
 * `value` as a plain hex string with no `0x` prefix (verified against
 * @stacks/transactions' own bufferCV encoder), so a base-16 parse of that
 * string is the same big-endian-bytes-to-uint conversion v0-8-market.clar's
 * own (private, otherwise uncallable) `buff-to-uint-be` does internally.
 */
export async function getStbtcLtv(senderAddress: string): Promise<number> {
  try {
    const cv = await fetchCallReadOnlyFunction({
      contractAddress: ZEST_DEPLOYER,
      contractName: ZEST_EGROUP,
      functionName: "resolve",
      functionArgs: [Cl.uint(ZSTBTC_ONLY_EGROUP_MASK)],
      senderAddress,
      network: NETWORK,
    });
    if (cv.type !== "ok") return FALLBACK_LTV;
    const group = cv.value;
    if (group.type !== "tuple") return FALLBACK_LTV;
    const ltvBuff = group.value["LTV-BORROW"];
    if (ltvBuff?.type !== "buffer") return FALLBACK_LTV;
    const bps = parseInt(ltvBuff.value, 16);
    if (!Number.isFinite(bps) || bps <= 0) return FALLBACK_LTV;
    return bps / 10_000;
  } catch {
    return FALLBACK_LTV;
  }
}

export async function getBtcUsdPrice(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
  if (!res.ok) throw new Error("could not fetch a BTC price for the borrow estimate");
  const data = (await res.json()) as { bitcoin: { usd: number } };
  return data.bitcoin.usd;
}

/** stBTC amount (sats) + BTC/USD price + real LTV (0..1, from getStbtcLtv) -> an estimated USDCx borrow limit, in whole USDCx. */
export function estimateBorrowableUsdc(stbtcSats: bigint, btcUsdPrice: number, ltv: number): number {
  const stbtcBtc = Number(stbtcSats) / 100_000_000;
  return stbtcBtc * btcUsdPrice * ltv;
}

// --- real, on-chain supplied-collateral read ------------------------------
//
// Unlike "available to borrow," this part IS a real read, not a guess:
// v0-market-vault exposes resolve-safe (principal -> internal account id,
// cleanly erroring - not panicking - for an account that's never touched
// the market) and get-collateral (id, asset -> raw stored amount), and
// v0-vault-stbtc exposes convert-to-assets (zstBTC shares -> underlying
// stBTC). Chaining these gives the user's actual supplied stBTC, not an
// echo of whatever they've typed into a form.

async function getZestAccountId(account: string, senderAddress: string): Promise<number | null> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: ZEST_DEPLOYER,
    contractName: ZEST_MARKET_VAULT,
    functionName: "resolve-safe",
    functionArgs: [Cl.principal(account)],
    senderAddress,
    network: NETWORK,
  });
  if (cv.type !== "ok") return null; // untracked account - never supplied/borrowed
  const tuple = cv.value;
  if (tuple.type !== "tuple") return null;
  const idCv = tuple.value.id;
  if (idCv.type !== "uint") return null;
  return Number(idCv.value);
}

/**
 * The caller's real supplied stBTC collateral on Zest, in sats. Returns 0n
 * for an account with no Zest position at all, or one that's never
 * supplied this specific asset - get-collateral panics on a missing map
 * entry (a real quirk of Zest's contract, not a bug here), so that case is
 * caught and treated as zero rather than surfaced as an error.
 */
export async function getSuppliedStbtc(account: string): Promise<bigint> {
  const accountId = await getZestAccountId(account, account);
  if (accountId === null) return 0n;

  let shares: bigint;
  try {
    const cv = await fetchCallReadOnlyFunction({
      contractAddress: ZEST_DEPLOYER,
      contractName: ZEST_MARKET_VAULT,
      functionName: "get-collateral",
      functionArgs: [Cl.uint(accountId), Cl.uint(ZEST_ZSTBTC_ASSET_ID)],
      senderAddress: account,
      network: NETWORK,
    });
    if (cv.type !== "uint") return 0n;
    shares = BigInt(cv.value);
  } catch {
    return 0n;
  }
  if (shares === 0n) return 0n;

  const assetsCv = await fetchCallReadOnlyFunction({
    contractAddress: ZEST_DEPLOYER,
    contractName: ZEST_STBTC_ZTOKEN_VAULT,
    functionName: "convert-to-assets",
    functionArgs: [Cl.uint(shares)],
    senderAddress: account,
    network: NETWORK,
  });
  if (assetsCv.type !== "ok") return 0n;
  const inner = assetsCv.value;
  if (inner.type !== "uint") return 0n;
  return BigInt(inner.value);
}
