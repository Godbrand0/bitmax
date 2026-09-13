// Central place for "which network are we on" - one env var switches the
// whole app between devnet/testnet/mainnet. Defaults to mainnet since
// that's where this app actually runs for real users (and the only
// network Zest's borrow integration works on at all - see lib/zest.ts);
// set NEXT_PUBLIC_NETWORK=devnet locally while iterating against
// `clarinet devnet start` instead.

import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";

export type BitmaxNetworkName = "devnet" | "testnet" | "mainnet";

export const NETWORK_NAME: BitmaxNetworkName =
  (process.env.NEXT_PUBLIC_NETWORK as BitmaxNetworkName) ?? "mainnet";

export const NETWORK =
  NETWORK_NAME === "mainnet"
    ? STACKS_MAINNET
    : NETWORK_NAME === "testnet"
      ? STACKS_TESTNET
      : STACKS_DEVNET;

// The account that deployed bitmax-vault/ve-stx-lock/bitmax-boost-distributor.
// The fallback below is Clarinet's devnet default deployer (an ST... address -
// only valid on devnet/testnet, never mainnet) and is a placeholder only:
// BitMax's own contracts are not deployed to mainnet yet. Until
// NEXT_PUBLIC_CONTRACT_DEPLOYER is set to a real mainnet deployment, the
// Dashboard/Boost pages will fail to read balances on mainnet - that's
// expected, not a bug, and separate from Zest's own contract in lib/zest.ts,
// which is real and live on mainnet regardless of BitMax's own deploy status.
export const CONTRACT_DEPLOYER =
  process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

export const CONTRACTS = {
  vault: "bitmax-vault",
  veLock: "ve-stx-lock",
  distributor: "bitmax-boost-distributor",
} as const;
