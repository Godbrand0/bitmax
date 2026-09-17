import { StacksClient } from "./chain.js";
import { shouldCloseEpoch } from "./epoch.js";
import { submitCloseEpoch, type NetworkName } from "./submit.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var required`);
  return value;
}

const apiUrl = process.env.STACKS_API_URL ?? "http://localhost:20443";
const contractAddress = requireEnv("CONTRACT_ADDRESS");
const distributorContractName = process.env.DISTRIBUTOR_CONTRACT_NAME ?? "bitmax-boost-distributor";
const network = (process.env.NETWORK ?? "devnet") as NetworkName;
const epochLengthBlocks = BigInt(process.env.EPOCH_LENGTH_BLOCKS ?? "144");
const pollIntervalSecs = Number(process.env.POLL_INTERVAL_SECS ?? "60");
const senderKey = requireEnv("KEEPER_PRIVATE_KEY");

const client = new StacksClient(apiUrl);

async function tick(): Promise<boolean> {
  const currentHeight = BigInt(await client.getBurnBlockHeight());
  const lastCloseHeight = await client.callReadOnlyUint(
    contractAddress,
    distributorContractName,
    "get-last-epoch-close-height",
    contractAddress
  );

  if (!shouldCloseEpoch(currentHeight, lastCloseHeight, epochLengthBlocks)) {
    return false;
  }

  const txid = await submitCloseEpoch({
    network,
    contractAddress,
    distributorContractName,
    senderKey,
  });
  console.log(`close-epoch broadcast: ${txid}`);
  return true;
}

async function main() {
  console.log(
    `bitmax-keeper starting: contract=${contractAddress}.${distributorContractName} epoch_length=${epochLengthBlocks} poll_interval=${pollIntervalSecs}s`
  );

  for (;;) {
    try {
      const triggered = await tick();
      console.log(triggered ? "close-epoch triggered" : "not due yet");
    } catch (err) {
      console.error("tick failed:", err instanceof Error ? err.message : err);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalSecs * 1000));
  }
}

main();
