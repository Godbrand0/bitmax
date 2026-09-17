"use client";

import { getExplorerTxUrl } from "@/lib/network";
import type { HistoryEntry } from "@/lib/history";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Card,
  ClockIcon,
  ExternalIcon,
  Skeleton,
} from "@/components/ui";

export type HistoryRowInfo = {
  label: string;
  /** "in" = funds arriving (green, down-arrow), "out" = leaving (amber, up-arrow), "neutral" = no fund movement (e.g. a lock, a claim of a non-monetary right). */
  direction: "in" | "out" | "neutral";
  /** Pre-formatted amount, e.g. "0.00050000 sBTC" - omit for actions with nothing to show. */
  amount?: string;
  /** Small pill next to the label, e.g. a strategy or contract name. */
  tag?: string;
};

const DIRECTION_STYLES: Record<HistoryRowInfo["direction"], { bg: string; fg: string; icon: React.ReactNode }> = {
  in: { bg: "bg-success-soft", fg: "text-success", icon: <ArrowDownIcon size={14} /> },
  out: { bg: "bg-warning-soft", fg: "text-warning", icon: <ArrowUpIcon size={14} /> },
  neutral: { bg: "bg-surface-muted", fg: "text-muted", icon: <ClockIcon size={14} /> },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "pending";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function HistoryRow({ entry, info }: { entry: HistoryEntry; info: HistoryRowInfo }) {
  const style = DIRECTION_STYLES[info.direction];
  const explorerUrl = getExplorerTxUrl(entry.txId);
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.fg}`}>
          {style.icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{info.label}</span>
            {info.tag && (
              // No uppercase here deliberately - tags carry mixed-case
              // token names (stBTC, sBTC) that an uppercase transform would
              // mangle into "STBTC"/"SBTC".
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
                {info.tag}
              </span>
            )}
            {entry.status !== "success" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  entry.status === "pending" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"
                }`}
              >
                {entry.status}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">{formatWhen(entry.blockTimeIso)}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {info.amount && <span className="num text-sm font-semibold text-foreground">{info.amount}</span>}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            View on explorer
            <ExternalIcon size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Recent on-chain activity for the connected wallet, built from that
 * address's own transaction list (see lib/history.ts's header for why this
 * needs no contract-emitted events for anything the user signs directly).
 */
export function HistoryPanel({
  title,
  subtitle,
  entries,
  describe,
  emptyText,
}: {
  title: string;
  subtitle?: string;
  /** null while loading. */
  entries: HistoryEntry[] | null;
  /** Maps a raw entry to a display row; return null to omit it entirely. */
  describe: (entry: HistoryEntry) => HistoryRowInfo | null;
  emptyText: string;
}) {
  const rows = entries?.map((e) => ({ entry: e, info: describe(e) })).filter((r) => r.info !== null) ?? null;

  return (
    <Card title={title} subtitle={subtitle}>
      {rows === null ? (
        <div className="flex flex-col divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map(({ entry, info }) => (
            <HistoryRow key={entry.txId} entry={entry} info={info!} />
          ))}
        </div>
      )}
    </Card>
  );
}
