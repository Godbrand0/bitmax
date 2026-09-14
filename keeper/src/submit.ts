// Signs and broadcasts `close-epoch` using @stacks/transactions directly -
// no subprocess boundary to a separate script/language needed now that the
// whole keeper is TypeScript (see readme.md for why this replaced an
// earlier Rust+Node split: the only Rust option for Stacks tx signing,
// stacks-rs, is stale, and a two-language service bought nothing here).

import { makeContractCall, broadcastTransaction, type StacksTransactionWire } from "@stacks/transactions";
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET, type StacksNetwork } from "@stacks/network";

export type NetworkName = "devnet" | "testnet" | "mainnet";

const NETWORKS: Record<NetworkName, StacksNetwork> = {
  devnet: STACKS_DEVNET,
  testnet: STACKS_TESTNET,
  mainnet: STACKS_MAINNET,
};

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
    functionArgs: [],
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
