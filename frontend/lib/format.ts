// Plain-language formatting helpers, kept out of the UI components so the
// conversion math (and its rounding) lives in one tested place.

const SATS_PER_BTC = 100_000_000n;
const USTX_PER_STX = 1_000_000n;

export function btcToSats(btcAmount: string): bigint {
  const trimmed = btcAmount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("enter a plain number, like 0.01");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "00000000").slice(0, 8);
  return BigInt(whole || "0") * SATS_PER_BTC + BigInt(paddedFraction);
}

export function satsToBtc(sats: bigint): string {
  const whole = sats / SATS_PER_BTC;
  const fraction = sats % SATS_PER_BTC;
  return `${whole}.${fraction.toString().padStart(8, "0")}`;
}

export function stxToUstx(stxAmount: string): bigint {
  const trimmed = stxAmount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("enter a plain number, like 100");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole || "0") * USTX_PER_STX + BigInt(paddedFraction);
}

// Lock-duration presets, in blocks (~10 min/block, matching ve-stx-lock.clar's
// MIN/MAX-LOCK-DURATION of ~2 weeks to ~6 months). Presented as plain time
// spans rather than raw block counts - nobody thinks in blocks. Block counts
// use 144 blocks/day and an average 365/12-day month, the same convention
// ve-stx-lock.clar's own constants are derived from.
export const LOCK_DURATION_PRESETS = [
  { label: "2 weeks (shortest boost)", blocks: 2_016 },
  { label: "1 month", blocks: 4_380 },
  { label: "3 months", blocks: 13_140 },
  { label: "6 months (biggest boost)", blocks: 26_280 },
] as const;
