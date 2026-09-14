// Minimal read access to a Stacks node: current chain height and a
// read-only contract call, decoded with @stacks/transactions' own Clarity
// deserializer rather than hand-rolling one - no reason to reimplement
// what the library already gets right.

import { cvToValue, hexToCV } from "@stacks/transactions";

export class StacksClient {
  constructor(private readonly baseUrl: string) {}

  async getBlockHeight(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/v2/info`);
    if (!res.ok) throw new Error(`GET /v2/info failed: ${res.status}`);
    const info = (await res.json()) as { stacks_tip_height: number };
    return info.stacks_tip_height;
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
