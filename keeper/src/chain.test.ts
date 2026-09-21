import { afterEach, describe, expect, it, vi } from "vitest";
import { Cl, cvToHex } from "@stacks/transactions";
import { StacksClient } from "./chain.js";

describe("StacksClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getBurnBlockHeight reads burn_block_height from /v2/info", async () => {
    // Deliberately includes both fields, like a real /v2/info response, so
    // this test would fail if the client read stacks_tip_height instead -
    // the two are numerically different on any real network, unlike in
    // Clarinet's simnet where they happen to move 1:1.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stacks_tip_height: 99999, burn_block_height: 12345 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new StacksClient("http://node.example");
    const height = await client.getBurnBlockHeight();

    expect(height).toBe(12345);
    expect(fetchMock).toHaveBeenCalledWith("http://node.example/v2/info");
  });

  it("getBurnBlockHeight throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const client = new StacksClient("http://node.example");
    await expect(client.getBurnBlockHeight()).rejects.toThrow("500");
  });

  it("callReadOnlyUint decodes a real Clarity-serialized uint response", async () => {
    const resultHex = cvToHex(Cl.uint(42));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ okay: true, result: resultHex }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new StacksClient("http://node.example");
    const value = await client.callReadOnlyUint("SP123", "some-contract", "get-thing", "SP123");

    expect(value).toBe(42n);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://node.example/v2/contracts/call-read/SP123/some-contract/get-thing",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("callReadOnlyUint throws when the node rejects the call", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ okay: false, cause: "no such contract" }),
      })
    );
    const client = new StacksClient("http://node.example");
    await expect(client.callReadOnlyUint("SP123", "c", "f", "SP123")).rejects.toThrow(
      "no such contract"
    );
  });
});
