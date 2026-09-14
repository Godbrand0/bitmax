// Gas sponsorship: every write in this app goes through here instead of
// calling @stacks/connect's request("stx_callContract", ...) directly, so
// the user never needs STX in their wallet just to pay a transaction fee.
//
// How it works: the wallet signs the transaction with `sponsored: true` -
// per @stacks/connect's own types this means it signs but does NOT
// broadcast (it can't yet; a sponsored transaction isn't valid until a
// sponsor co-signs and pays the fee), returning the raw signed tx instead
// of a txid. That raw tx is POSTed to this app's own `/api/sponsor` route,
// which holds the actual sponsor private key server-side (see
// app/api/sponsor/route.ts) and only ever runs on the server - the key is
// never in this file, never in the browser bundle.

import { request } from "@stacks/connect";
import type { ClarityValue, PostConditionModeName } from "@stacks/transactions";
import { NETWORK_NAME } from "./network";

export async function submitSponsored(opts: {
  contract: `${string}.${string}`;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditionMode?: PostConditionModeName;
}): Promise<{ txid: string }> {
  const result = await request("stx_callContract", {
    contract: opts.contract,
    functionName: opts.functionName,
    functionArgs: opts.functionArgs,
    network: NETWORK_NAME,
    sponsored: true,
    postConditionMode: opts.postConditionMode,
  });

  if (!result.transaction) {
    throw new Error(
      "Your wallet didn't return a sponsorable transaction - it may not support sponsored transactions yet."
    );
  }

  const res = await fetch("/api/sponsor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: result.transaction, network: NETWORK_NAME }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Sponsorship failed.");
  }
  return { txid: data.txid as string };
}
