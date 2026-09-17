// Transaction history, built from the connected wallet's own on-chain
// activity rather than a custom indexer or contract-emitted events.
//
// Every action a history panel shows here is one the user signed
// themselves (deposit, redeem, lock-stx, supply-collateral-add, ...), so
// it's already a first-class entry in that address's own transaction list
// - Hiro's Extended API exposes function name, decoded args, status and
// timestamp for every contract call an address has made, with no need for
// bitmax-vault.clar/ve-stx-lock.clar to print anything themselves. This
// deliberately does NOT cover the boost's actual payout (bitmax-boost-
// distributor.credit-share, run inside a keeper-triggered close-epoch,
// never signed by the locker) - that's why the Boost history panel is
// framed as "lock activity", not "every epoch you were paid"; see
// components/history/HistoryPanel's own comment for the fuller reasoning.

const HIRO_API_BASE = "https://api.hiro.so";

export type HistoryEntry = {
  txId: string;
  functionName: string;
  status: "success" | "pending" | "failed";
  blockTimeIso: string | null;
  /** Decoded Clarity args in call order, as their pretty-printed repr (e.g. "u50000000"). */
  args: string[];
};

/**
 * The connected address's own recent contract-call transactions against a
 * specific set of contracts, most recent first. Fetches one page (Hiro's
 * `/transactions` is address-wide, not contract-scoped, so filtering to
 * `contractIds` happens client-side) - fine for a "recent activity" panel;
 * this intentionally doesn't paginate indefinitely looking for older
 * matches, the same scope every other read in this app keeps to.
 */
export async function getContractCallHistory(
  address: string,
  contractIds: readonly string[],
  opts: { limit?: number } = {}
): Promise<HistoryEntry[]> {
  const fetchLimit = opts.limit ?? 50;
  const res = await fetch(
    `${HIRO_API_BASE}/extended/v2/addresses/${address}/transactions?limit=${fetchLimit}`
  );
  if (!res.ok) throw new Error("could not reach the Stacks API for transaction history");
  const data = (await res.json()) as {
    results: Array<{
      tx: {
        tx_id: string;
        tx_status: string;
        block_time_iso: string | null;
        tx_type: string;
        contract_call?: {
          contract_id: string;
          function_name: string;
          function_args: Array<{ repr: string }>;
        };
      };
    }>;
  };

  const wanted = new Set(contractIds);
  return data.results
    .filter((r) => r.tx.tx_type === "contract_call" && r.tx.contract_call)
    .filter((r) => wanted.has(r.tx.contract_call!.contract_id))
    .map((r) => ({
      txId: r.tx.tx_id,
      functionName: r.tx.contract_call!.function_name,
      status:
        r.tx.tx_status === "success"
          ? ("success" as const)
          : r.tx.tx_status === "pending"
            ? ("pending" as const)
            : ("failed" as const),
      blockTimeIso: r.tx.block_time_iso,
      args: r.tx.contract_call!.function_args.map((a) => a.repr),
    }));
}

/** Parses a Clarity uint repr like "u50000000" back to a bigint, or null if it isn't one. */
export function parseUintRepr(repr: string | undefined): bigint | null {
  if (!repr || !repr.startsWith("u")) return null;
  try {
    return BigInt(repr.slice(1));
  } catch {
    return null;
  }
}
