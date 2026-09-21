// Signs and broadcasts `close-epoch` using @stacks/transactions directly -
// no subprocess boundary to a separate script/language needed now that the
// whole keeper is TypeScript (see readme.md for why this replaced an
// earlier Rust+Node split: the only Rust option for Stacks tx signing,
// stacks-rs, is stale, and a two-language service bought nothing here).

import { Cl, makeContractCall, broadcastTransaction, type StacksTransactionWire } from "@stacks/transactions";
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET, type StacksNetwork } from "@stacks/network";

export type NetworkName = "devnet" | "testnet" | "mainnet";

const NETWORKS: Record<NetworkName, StacksNetwork> = {
  devnet: STACKS_DEVNET,
  testnet: STACKS_TESTNET,
  mainnet: STACKS_MAINNET,
};

// close-epoch forwards these into ve-stx-lock.claim-boost-reward, which
// pins them against these exact real mainnet principals - see
// ve-stx-lock.clar's header. Only meaningful once the keeper runs against
// mainnet; on devnet/testnet close-epoch's own total-weight check almost
// always short-circuits before these are ever used for real (nobody can
// have a real lock there either, since lock-stx pins the same principals).
const SBTC_TOKEN_MAINNET = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
const STSTXBTC_TRACKING_MAINNET = "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststxbtc-tracking-v2";

export async function submitCloseEpoch(config: {
  network: NetworkName;
  contractAddress: string;
  distributorContractName: string;
  senderKey: string;
}): Promise<string> {
  const network = NETWORKS[config.network];
  if (!network) {
    throw new Error(`unknown network "${config.network}" - expected devnet, testnet, or mainnet`);
  }

  const transaction: StacksTransactionWire = await makeContractCall({
    contractAddress: config.contractAddress,
    contractName: config.distributorContractName,
    functionName: "close-epoch",
    functionArgs: [Cl.principal(SBTC_TOKEN_MAINNET), Cl.principal(STSTXBTC_TRACKING_MAINNET)],
    senderKey: config.senderKey,
    network,
    // close-epoch moves no STX/tokens out of the keeper's own account, so
    // denying any post-condition is the correct default, not an oversight.
    postConditionMode: "deny",
  });

  const result = await broadcastTransaction({ transaction, network });
  if ("error" in result && result.error) {
    throw new Error(`broadcast failed: ${result.error} - ${("reason" in result && result.reason) || ""}`);
  }
  return result.txid;
}
