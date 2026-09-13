export type StatusKind = "info" | "error" | "success";

export function Status({ text, kind }: { text: string; kind: StatusKind }) {
  const color =
    kind === "error"
      ? "text-red-600 dark:text-red-400"
      : kind === "success"
        ? "text-green-600 dark:text-green-400"
        : "text-zinc-500 dark:text-zinc-400";
  return <p className={`mt-3 text-sm ${color}`}>{text}</p>;
}
