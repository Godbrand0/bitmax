// Minimal read access to a Stacks node: current chain height and a
// read-only contract call, decoded with @stacks/transactions' own Clarity
// deserializer rather than hand-rolling one - no reason to reimplement
// what the library already gets right.

import { cvToValue, hexToCV } from "@stacks/transactions";

export class StacksClient {
  constructor(private readonly baseUrl: string) {}

  // bitmax-boost-distributor.clar's EPOCH-LENGTH counts burn-block-height
  // (Bitcoin blocks, ~10min each) - same clock as ve-stx-lock.clar's lock
  // durations, and for the same reason (see that contract's header).
  // stacks_tip_height is the wrong field: Stacks blocks run ~11.8s on
  // mainnet, which would make this poll close-epoch roughly 50x more often
  // than EPOCH-LENGTH intends.
  async getBurnBlockHeight(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/v2/info`);
    if (!res.ok) throw new Error(`GET /v2/info failed: ${res.status}`);
    const info = (await res.json()) as { burn_block_height: number };
    return info.burn_block_height;
  }

  /** Calls a read-only function that returns a plain `uint` (not wrapped in a `(response ...)`). */
  async callReadOnlyUint(
    contractAddress: string,
    contractName: string,
    functionName: string,
    sender: string
  ): Promise<bigint> {
    const res = await fetch(
      `${this.baseUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sender, arguments: [] }),
      }
    );
    if (!res.ok) throw new Error(`call-read-only ${functionName} failed: ${res.status}`);
    const parsed = (await res.json()) as { okay: boolean; result?: string; cause?: string };
    if (!parsed.okay) {
      throw new Error(`call-read-only ${functionName} rejected: ${parsed.cause ?? "unknown"}`);
    }
    if (!parsed.result) {
      throw new Error(`call-read-only ${functionName} missing result`);
    }

    const value = cvToValue(hexToCV(parsed.result));
    if (typeof value !== "bigint" && typeof value !== "number") {
      throw new Error(`expected a uint from ${functionName}, got ${typeof value}`);
    }
    return BigInt(value);
  }
}
