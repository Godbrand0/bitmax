import { NETWORK } from "./network";

export async function getBlockHeight(): Promise<number> {
  const res = await fetch(`${NETWORK.client.baseUrl}/v2/info`);
  if (!res.ok) throw new Error("could not reach the Stacks node for the current block height");
  const info = await res.json();
  return info.stacks_tip_height as number;
}
