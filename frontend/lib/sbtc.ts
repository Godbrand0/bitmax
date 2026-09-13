// sBTC peg-in / peg-out helpers.
//
// IMPORTANT: sBTC's docs previously lived at github.com/stacks-network/sbtc-docs;
// that repo is archived. Current docs are under docs.stacks.co/more-guides/sbtc/.
// Verified against the `sbtc` npm package's own .d.ts files (v0.3.2), not just
// the docs prose, since the docs summarize but don't compile.
//
// Deposit (BTC -> sBTC) is NOT a Clarity contract call from the depositor's
// side - it's a Bitcoin transaction to a per-deposit P2TR address, followed
// by notifying the Emily coordination API so signers pick it up and mint.
// Withdrawal (sBTC -> BTC) IS a Clarity contract call, on `.sbtc-withdrawal`.

import {
  buildSbtcDepositAddress,
  SbtcApiClientMainnet,
  SbtcApiClientTestnet,
  MAINNET,
  TESTNET,
  type BitcoinNetwork,
} from "sbtc";
import { request } from "@stacks/connect";
import { Cl } from "@stacks/transactions";

export type BitmaxNetwork = "mainnet" | "testnet";

// SM... is the mainnet sBTC deployer principal; the testnet deployer differs
// per sBTC's own testnet deployment - confirm the current one before testnet use.
const SBTC_WITHDRAWAL_CONTRACT: Record<BitmaxNetwork, string> = {
  mainnet: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal",
  testnet: "", // TODO: fill in once confirmed against sBTC's current testnet deployment
};

function apiClient(network: BitmaxNetwork) {
  return network === "mainnet"
    ? new SbtcApiClientMainnet()
    : new SbtcApiClientTestnet();
}

function btcNetwork(network: BitmaxNetwork): BitcoinNetwork {
  return network === "mainnet" ? MAINNET : TESTNET;
}

/**
 * Step 1 of a deposit: derive the one-time P2TR address the user must send
 * BTC to. `reclaimPublicKey` is the depositor's own BTC pubkey (used only if
 * the signers fail to process the deposit, to reclaim funds).
 */
export async function buildDepositAddress(opts: {
  network: BitmaxNetwork;
  stacksAddress: string;
  reclaimPublicKey: string;
  maxSignerFeeSats?: number;
  reclaimLockTime?: number;
}) {
  const client = apiClient(opts.network);
  const signersPublicKey = await client.fetchSignersPublicKey();

  return buildSbtcDepositAddress({
    network: btcNetwork(opts.network),
    stacksAddress: opts.stacksAddress,
    signersPublicKey,
    reclaimPublicKey: opts.reclaimPublicKey,
    maxSignerFee: opts.maxSignerFeeSats ?? 80_000,
    reclaimLockTime: opts.reclaimLockTime ?? 950,
  });
}

/**
 * Step 2: have the connected wallet send BTC to the deposit address built
 * above. Returns the Bitcoin txid.
 */
export async function sendDepositTransfer(opts: {
  address: string;
  amountSats: number;
}): Promise<string> {
  const result = await request("sendTransfer", {
    recipients: [{ address: opts.address, amount: opts.amountSats }],
  });
  return result.txid;
}

/**
 * Step 3: notify the Emily API so sBTC signers sweep the deposit and mint.
 * Without this step the deposit sits unprocessed even though the BTC is sent.
 */
export async function notifyDeposit(opts: {
  network: BitmaxNetwork;
  txid: string;
  depositScript: string;
  reclaimScript: string;
}) {
  const client = apiClient(opts.network);
  const transaction = await client.fetchTxHex(opts.txid);
  return client.notifySbtc({
    transaction,
    depositScript: opts.depositScript,
    reclaimScript: opts.reclaimScript,
  });
}

/**
 * Full deposit flow, chaining the three steps above. Surfaces the ~20 minute
 * signer-processing wait via the returned notify response - the UI should
 * show this honestly rather than implying an instant balance update.
 */
export async function depositBtcToSbtc(opts: {
  network: BitmaxNetwork;
  stacksAddress: string;
  reclaimPublicKey: string;
  amountSats: number;
}) {
  const deposit = await buildDepositAddress(opts);
  const txid = await sendDepositTransfer({
    address: deposit.address,
    amountSats: opts.amountSats,
  });
  const notified = await notifyDeposit({
    network: opts.network,
    txid,
    depositScript: deposit.depositScript,
    reclaimScript: deposit.reclaimScript,
  });
  return { txid, deposit, notified };
}

/**
 * Withdrawal (sBTC -> BTC): a direct call to `.sbtc-withdrawal`'s
 * `initiate-withdrawal-request`. Locks `amountSats + maxFeeSats` of the
 * caller's sBTC; signers later send `amountSats` BTC to `recipient` and keep
 * up to `maxFeeSats`, refunding any unused portion. Confirms in seconds on
 * Stacks but the underlying BTC transfer needs ~6 Bitcoin confirmations.
 *
 * `recipient` must be pre-decoded into SIP-005 Bitcoin-address parts
 * (version byte + hash bytes) - the `sbtc` package does not include a
 * withdrawal helper (its withdraw module is a stub as of v0.3.2), so this
 * still needs a small address-decoding step via @scure/btc-signer before
 * calling this function. Not yet implemented here - do that before wiring
 * this into the UI.
 */
export async function initiateWithdrawal(opts: {
  network: BitmaxNetwork;
  amountSats: number;
  maxFeeSats: number;
  recipient: { version: Uint8Array; hashbytes: Uint8Array };
}) {
  const contract = SBTC_WITHDRAWAL_CONTRACT[opts.network];
  if (!contract) {
    throw new Error(
      `sBTC withdrawal contract principal not set for network "${opts.network}"`
    );
  }
  const [contractAddress, contractName] = contract.split(".");

  return request("stx_callContract", {
    contract: `${contractAddress}.${contractName}`,
    functionName: "initiate-withdrawal-request",
    functionArgs: [
      Cl.uint(opts.amountSats),
      Cl.tuple({
        version: Cl.buffer(opts.recipient.version),
        hashbytes: Cl.buffer(opts.recipient.hashbytes),
      }),
      Cl.uint(opts.maxFeeSats),
    ],
    network: opts.network,
  });
}
