/**
 * Presentational primitives. Deliberately directive-free so server
 * components (the docs page) can render them without pulling the whole kit
 * into the client bundle.
 */

/* ───────────────────────────── Card ───────────────────────────── */

export function Card({
  title,
  step,
  subtitle,
  icon,
  action,
  children,
  className = "",
  tone = "default",
  padding = "default",
}: {
  title?: string;
  step?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Right-aligned control in the card header. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: "default" | "brand" | "sunken" | "plain";
  padding?: "default" | "tight" | "none";
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-surface",
    brand: "border-brand/25 bg-brand-softer",
    sunken: "border-border bg-surface-muted",
    plain: "border-transparent bg-transparent",
  };
  const pads: Record<string, string> = {
    default: "p-5 sm:p-6",
    tight: "p-4",
    none: "",
  };

  return (
    <section
      className={`rounded-2xl border shadow-xs ${tones[tone]} ${pads[padding]} ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {step != null && (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white shadow-xs">
                {step}
              </span>
            )}
            {icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && (
        <div className="text-sm leading-relaxed text-foreground-soft">{children}</div>
      )}
    </section>
  );
}

/* ───────────────────────────── Badge / Pill ───────────────────────────── */

export function Badge({
  children,
  tone = "brand",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "brand" | "neutral" | "success" | "warning" | "danger" | "accent" | "outline";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-soft text-brand-ink",
    neutral: "bg-surface-muted text-muted",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent-ink",
    outline: "border border-border bg-surface text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Small labelled chip used in flow diagrams and trust rows. */
export function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground-soft ${className}`}
    >
      {children}
    </span>
  );
}

/* ───────────────────────────── Stats ───────────────────────────── */

export function StatTile({
  label,
  value,
  tone = "default",
  hint,
  icon,
  size = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "positive" | "muted" | "brand";
  hint?: string;
  icon?: React.ReactNode;
  size?: "default" | "large";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    positive: "text-success",
    muted: "text-muted",
    brand: "text-brand",
  };
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {icon}
        {label}
      </p>
      <p
        className={`num mt-1.5 font-semibold ${
          size === "large" ? "text-2xl sm:text-3xl" : "text-lg"
        } ${tones[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/* ───────────────────────────── Section heading ───────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`flex flex-col ${alignment} ${className}`}>
      {eyebrow && (
        <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
          <span className="h-1 w-1 rounded-full bg-brand" />
          {eyebrow}
        </p>
      )}
      <h2 className="text-balance font-display text-3xl font-normal leading-[1.15] tracking-tight text-foreground sm:text-[2.6rem]">
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 max-w-xl text-[15px] leading-relaxed text-muted ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────────── Icon circle ───────────────────────────── */

export function IconCircle({
  children,
  tone = "brand",
  size = "default",
}: {
  children: React.ReactNode;
  tone?: "brand" | "neutral" | "success" | "accent";
  size?: "default" | "large" | "small";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    neutral: "bg-surface-muted text-muted",
    success: "bg-success-soft text-success",
    accent: "bg-accent-soft text-accent",
  };
  const sizes: Record<string, string> = {
    small: "h-8 w-8",
    default: "h-11 w-11",
    large: "h-14 w-14",
  };
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${tones[tone]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

/* ───────────────────────────── Divider ───────────────────────────── */

export function Divider({ label, className = "" }: { label?: string; className?: string }) {
  if (!label) {
    return <hr className={`border-0 border-t border-border ${className}`} />;
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ───────────────────────────── Skeleton ─────────────────────────────
   Replaces the old bare "..." placeholders while chain reads are in flight. */

export function Skeleton({ className = "w-24 h-6" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded-md bg-surface-sunken align-middle ${className}`}
    />
  );
}
