import { AlertIcon, CheckIcon, InfoIcon } from "@/components/ui/Icons";

export type StatusKind = "info" | "error" | "success";

const STYLES: Record<
  StatusKind,
  { wrap: string; icon: string; text: string; node: React.ReactNode }
> = {
  info: {
    wrap: "border-border bg-surface-muted",
    icon: "bg-surface text-muted",
    text: "text-foreground-soft",
    node: <InfoIcon size={14} />,
  },
  success: {
    wrap: "border-success/30 bg-success-soft",
    icon: "bg-success text-white",
    text: "text-success",
    node: <CheckIcon size={14} />,
  },
  error: {
    wrap: "border-danger/30 bg-danger-soft",
    icon: "bg-danger text-white",
    text: "text-danger",
    node: <AlertIcon size={14} />,
  },
};

export function Status({ text, kind }: { text: string; kind: StatusKind }) {
  const s = STYLES[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`mt-3 flex animate-pop-in items-start gap-3 rounded-xl border p-3.5 ${s.wrap}`}
    >
      <span
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.icon}`}
      >
        {s.node}
      </span>
      <p className={`text-[13px] leading-relaxed ${s.text}`}>{text}</p>
    </div>
  );
}
