// Central place for "which network are we on" - one env var switches the
// whole app between devnet/testnet/mainnet, matching the deployment path
// in readme.md section 14 (devnet first, then testnet, then mainnet).

import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";

export type BitmaxNetworkName = "devnet" | "testnet" | "mainnet";

export const NETWORK_NAME: BitmaxNetworkName =
  (process.env.NEXT_PUBLIC_NETWORK as BitmaxNetworkName) ?? "devnet";

export const NETWORK =
  NETWORK_NAME === "mainnet"
    ? STACKS_MAINNET
    : NETWORK_NAME === "testnet"
      ? STACKS_TESTNET
      : STACKS_DEVNET;

// The account that deployed the contracts - Clarinet's devnet default
// deployer, overridable per network via env for testnet/mainnet.
export const CONTRACT_DEPLOYER =
  process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

export const CONTRACTS = {
  vault: "bitmax-vault",
  veLock: "ve-stx-lock",
  distributor: "bitmax-boost-distributor",
} as const;
