import { describe, expect, it } from "vitest";
import { shouldCloseEpoch } from "./epoch.js";

describe("shouldCloseEpoch", () => {
  it("allows the first ever close at any height", () => {
    expect(shouldCloseEpoch(1n, 0n, 144n)).toBe(true);
    expect(shouldCloseEpoch(100_000n, 0n, 144n)).toBe(true);
  });

  it("rejects closing before epoch length has passed", () => {
    expect(shouldCloseEpoch(100n, 50n, 144n)).toBe(false);
    expect(shouldCloseEpoch(193n, 50n, 144n)).toBe(false); // one block short
  });

  it("allows closing once epoch length has passed", () => {
    expect(shouldCloseEpoch(194n, 50n, 144n)).toBe(true); // exactly on the boundary
    expect(shouldCloseEpoch(500n, 50n, 144n)).toBe(true);
  });
});
