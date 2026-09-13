export type StatusKind = "info" | "error" | "success";

const STYLES: Record<StatusKind, { border: string; bg: string; text: string; icon: string }> = {
  info: { border: "border-border", bg: "bg-surface-muted", text: "text-muted", icon: "ℹ" },
  success: { border: "border-success", bg: "bg-success-soft", text: "text-success", icon: "✓" },
  error: { border: "border-danger", bg: "bg-danger-soft", text: "text-danger", icon: "!" },
};

export function Status({ text, kind }: { text: string; kind: StatusKind }) {
  const s = STYLES[kind];
  return (
    <div className={`mt-3 flex items-start gap-2.5 rounded-xl border-l-4 ${s.border} ${s.bg} px-4 py-3`}>
      <span className={`mt-0.5 text-sm font-bold ${s.text}`}>{s.icon}</span>
      <p className={`text-sm leading-relaxed ${s.text}`}>{text}</p>
    </div>
  );
}
