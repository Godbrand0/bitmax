// Server-only. Holds the sponsor private key and pays the gas fee for
// every transaction this app sponsors - see lib/sponsor.ts for the client
// side of this flow and why it's split this way.
//
// SPONSOR_PRIVATE_KEY must be set as a plain (non-NEXT_PUBLIC_) env var so
// it never reaches the browser bundle. Fund that key's address with STX on
// whichever network(s) you want sponsorship to work on - every sponsored
// transaction spends real STX from it.

import { NextRequest, NextResponse } from "next/server";
import {
  addressToString,
  broadcastTransaction,
  deserializeTransaction,
  PayloadType,
  sponsorTransaction,
} from "@stacks/transactions";
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET, type StacksNetwork } from "@stacks/network";

const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;
const SPONSOR_FEE = BigInt(process.env.SPONSOR_FEE_USTX ?? "3000");
const ZEST_DEPLOYER = "SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7";

const NETWORKS: Record<string, StacksNetwork> = {
  mainnet: STACKS_MAINNET,
  testnet: STACKS_TESTNET,
  devnet: STACKS_DEVNET,
};

// Only sponsor calls into contracts BitMax actually integrates with - this
// endpoint would otherwise be a free transaction-broadcasting service for
// anyone, paid for out of the sponsor wallet.
function isAllowedContract(contractAddress: string, contractName: string): boolean {
  const bitmaxDeployer = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER;
  const bitmaxContracts = ["bitmax-vault", "ve-stx-lock", "bitmax-boost-distributor"];
  if (bitmaxDeployer && contractAddress === bitmaxDeployer && bitmaxContracts.includes(contractName)) {
    return true;
  }
  if (contractAddress === ZEST_DEPLOYER && contractName === "v0-8-market") {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!SPONSOR_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Gas sponsorship isn't configured on this deployment yet (SPONSOR_PRIVATE_KEY unset)." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const hex = body?.transaction;
  const networkName = body?.network;
  if (typeof hex !== "string" || typeof networkName !== "string") {
    return NextResponse.json({ error: "Missing transaction or network." }, { status: 400 });
  }
  const network = NETWORKS[networkName];
  if (!network) {
    return NextResponse.json({ error: `Unknown network "${networkName}".` }, { status: 400 });
  }

  let transaction;
  try {
    transaction = deserializeTransaction(hex);
  } catch {
    return NextResponse.json({ error: "Could not parse the transaction." }, { status: 400 });
  }

  if (transaction.payload.payloadType !== PayloadType.ContractCall) {
    return NextResponse.json({ error: "Only contract-call transactions can be sponsored." }, { status: 400 });
  }

  const contractAddress = addressToString(transaction.payload.contractAddress);
  const contractName = transaction.payload.contractName.content;
  if (!isAllowedContract(contractAddress, contractName)) {
    return NextResponse.json(
      { error: `${contractAddress}.${contractName} isn't eligible for gas sponsorship.` },
      { status: 403 }
    );
  }

  try {
    const sponsored = await sponsorTransaction({
      transaction,
      sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
      fee: SPONSOR_FEE,
      network,
    });
    const result = await broadcastTransaction({ transaction: sponsored, network });
    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: `${result.error}${"reason" in result && result.reason ? ` - ${result.reason}` : ""}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ txid: result.txid });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sponsorship failed." },
      { status: 500 }
    );
  }
}
