#!/usr/bin/env node
// Signs and broadcasts a `close-epoch` contract-call, using
// @stacks/transactions rather than anything hand-rolled - see
// keeper/src/chain.rs and submit.rs for why signing lives here and not in
// the Rust side of this service.
//
// Usage: node submit-close-epoch.mjs <network> <contractAddress> <contractName>
// Requires KEEPER_PRIVATE_KEY in the environment. Prints the broadcast
// txid to stdout on success; any error goes to stderr with a non-zero exit.

import { makeContractCall, broadcastTransaction } from "@stacks/transactions";
import { STACKS_DEVNET, STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

const [network, contractAddress, contractName] = process.argv.slice(2);
const senderKey = process.env.KEEPER_PRIVATE_KEY;

if (!network || !contractAddress || !contractName) {
  console.error(
    "usage: submit-close-epoch.mjs <network> <contractAddress> <contractName>"
  );
  process.exit(1);
}
if (!senderKey) {
  console.error("KEEPER_PRIVATE_KEY env var is required");
  process.exit(1);
}

const networksByName = {
  devnet: STACKS_DEVNET,
  testnet: STACKS_TESTNET,
  mainnet: STACKS_MAINNET,
};
const resolvedNetwork = networksByName[network];
if (!resolvedNetwork) {
  console.error(`unknown network "${network}" - expected devnet, testnet, or mainnet`);
  process.exit(1);
}

try {
  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName: "close-epoch",
    functionArgs: [],
    senderKey,
    network: resolvedNetwork,
    // the vault/distributor contracts move no STX/tokens on close-epoch
    // from the keeper's own account, so denying any post-condition is
    // the correct default rather than an oversight.
    postConditionMode: "deny",
  });

  const result = await broadcastTransaction({
    transaction,
    network: resolvedNetwork,
  });

  if (result.error) {
    console.error(`broadcast failed: ${result.error} - ${result.reason ?? ""}`);
    process.exit(1);
  }

  console.log(result.txid);
} catch (err) {
  console.error(err.stack ?? String(err));
  process.exit(1);
}
