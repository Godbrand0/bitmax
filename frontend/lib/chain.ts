import { NETWORK } from "./network";

// ve-stx-lock.clar's lock durations are counted in burn-block-height
// (Bitcoin blocks, ~10min each) - see that contract's header for why:
// StackingDAO's own real Dual Stacking withdrawal cooldown is measured on
// the same clock. `stacks_tip_height` from this same endpoint is the wrong
// field to read here - it's the Stacks chain's own block count (~11.8s per
// block on mainnet, and not even constant under Nakamoto fast blocks),
// which would make MIN/MAX-LOCK-DURATION mean something ~50x shorter than
// intended.
export async function getBurnBlockHeight(): Promise<number> {
  const res = await fetch(`${NETWORK.client.baseUrl}/v2/info`);
  if (!res.ok) throw new Error("could not reach the Stacks node for the current block height");
  const info = await res.json();
  return info.burn_block_height as number;
}
