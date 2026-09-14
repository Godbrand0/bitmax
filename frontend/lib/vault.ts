// Thin wrappers around bitmax-vault / ve-stx-lock contract calls, kept
// separate from the UI so components stay focused on presentation.

import { request } from "@stacks/connect";
import { Cl, fetchCallReadOnlyFunction, type ClarityValue } from "@stacks/transactions";
import { CONTRACT_DEPLOYER, CONTRACTS, NETWORK, NETWORK_NAME } from "./network";

function contract(name: string): `${string}.${string}` {
  return `${CONTRACT_DEPLOYER}.${name}` as `${string}.${string}`;
}

function readUint(cv: ClarityValue): bigint {
  if (cv.type !== "uint") {
    throw new Error(`expected a uint clarity value, got "${cv.type}"`);
  }
  return BigInt(cv.value);
}

// --- writes (wallet-signed) ---------------------------------------------

export async function depositSbtc(amountSats: bigint) {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.vault),
    functionName: "deposit",
    functionArgs: [Cl.uint(amountSats)],
    network: NETWORK_NAME,
  });
}

export async function redeemStbtc(amountSats: bigint) {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.vault),
    functionName: "redeem",
    functionArgs: [Cl.uint(amountSats)],
    network: NETWORK_NAME,
  });
}

export async function redeemToSbtc(amountSats: bigint) {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.vault),
    functionName: "redeem-to-sbtc",
    functionArgs: [Cl.uint(amountSats)],
    network: NETWORK_NAME,
  });
}

export async function lockStx(amountUstx: bigint, unlockHeight: bigint) {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.veLock),
    functionName: "lock-stx",
    functionArgs: [Cl.uint(amountUstx), Cl.uint(unlockHeight)],
    network: NETWORK_NAME,
  });
}

export async function unlockStx() {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.veLock),
    functionName: "unlock-stx",
    functionArgs: [],
    network: NETWORK_NAME,
  });
}

export async function registerForBoost() {
  return request("stx_callContract", {
    contract: contract(CONTRACTS.distributor),
    functionName: "register",
    functionArgs: [],
    network: NETWORK_NAME,
  });
}

// --- reads (no wallet interaction) --------------------------------------

export async function getVaultBalance(address: string): Promise<bigint> {
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

// The real sBTC SIP-010 token, distinct from bitmax-vault - this is what
// the user actually holds in their own wallet before depositing, and what
// the Borrow page reads to show a live "your sBTC balance" figure. On
// mainnet it's sBTC's real deployed contract; on devnet/testnet there's no
// such deployment reachable here, so it falls back to our own mock-sbtc
// (the same stand-in bitmax-vault itself is built and tested against - see
// readme.md section 6 on Phase 3).
const SBTC_TOKEN_MAINNET = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";

export async function getSbtcBalance(address: string): Promise<bigint> {
  const [contractAddress, contractName] =
    NETWORK_NAME === "mainnet" ? SBTC_TOKEN_MAINNET.split(".") : [CONTRACT_DEPLOYER, "mock-sbtc"];
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

// StackingDAO's real stBTC SIP-010 token - what the vault actually pays out
// on redeem, and what Zest's Borrow page supplies as collateral (Zest takes
// stBTC itself, not sBTC - see lib/zest.ts). Confirmed against StackingDAO's
// own deployed source (github.com/StackingDAO/stackingdao-smart-contracts,
// mainnet/contracts/tokens/stbtc-token.clar), not guessed: standard SIP-010,
// 8 decimals. On devnet/testnet, falls back to our own mock-stbtc.
const STBTC_TOKEN_MAINNET = "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stbtc-token";

export async function getStbtcBalance(address: string): Promise<bigint> {
  const [contractAddress, contractName] =
    NETWORK_NAME === "mainnet" ? STBTC_TOKEN_MAINNET.split(".") : [CONTRACT_DEPLOYER, "mock-stbtc"];
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
