"use client";

import { ArrowRightIcon } from "./Icons";

/* ───────────────────────────── Button ─────────────────────────────
   One button component with variants, replacing the previous
   Primary/Secondary pair (both of which were hardcoded full-width). */

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  type?: "button" | "submit";
  className?: string;
  icon?: React.ReactNode;
  /** Shows a trailing arrow that slides on hover. */
  arrow?: boolean;
  title?: string;
};

export function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  full = false,
  type = "button",
  className = "",
  icon,
  arrow = false,
  title,
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand text-white shadow-sm hover:bg-brand-hover hover:shadow-md active:bg-brand-active",
    secondary:
      "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted",
    ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
    danger: "bg-danger text-white hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    sm: "px-3.5 py-2 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2.5 text-sm rounded-xl gap-2",
    lg: "px-6 py-3.5 text-[15px] rounded-xl gap-2",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`group/btn relative inline-flex items-center justify-center overflow-hidden font-semibold transition-all duration-200 ease-out
        ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""}
        active:scale-[0.985]
        disabled:pointer-events-none disabled:opacity-40
        ${className}`}
    >
      {/* Sheen sweep on hover - only on the filled variant, where it reads. */}
      {variant === "primary" && !isDisabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-white/20 transition-transform duration-700 ease-out group-hover/btn:translate-x-[220%]"
        />
      )}
      {loading ? (
        <Spinner />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span className="relative">{children}</span>
      {arrow && !loading && (
        <ArrowRightIcon
          size={16}
          className="shrink-0 transition-transform duration-200 ease-out group-hover/btn:translate-x-1"
        />
      )}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
    />
  );
}

/* Back-compat aliases so existing call sites keep working. */
export function PrimaryButton(props: Omit<ButtonProps, "variant" | "full">) {
  return <Button {...props} variant="primary" full />;
}
export function SecondaryButton(props: Omit<ButtonProps, "variant" | "full">) {
  return <Button {...props} variant="secondary" full />;
}

/* ───────────────────────────── Inputs ───────────────────────────── */

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-muted/70 hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/25 disabled:opacity-50"
    />
  );
}

/**
 * Amount field with a unit suffix and an optional Max button.
 *
 * The old UI made people read their balance from a sentence above the input
 * and retype it by hand; this wires the balance directly to the field.
 */
export function AmountInput({
  value,
  onChange,
  placeholder,
  unit,
  max,
  onMax,
  label,
  hint,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  /** Display string for the available balance, e.g. "0.0421 sBTC". */
  max?: string;
  onMax?: () => void;
  label?: string;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      {(label || max) && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          {label && (
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {label}
            </label>
          )}
          {max && (
            <span className="num text-xs text-muted">
              Available <span className="font-semibold text-foreground">{max}</span>
            </span>
          )}
        </div>
      )}
      <div className="group relative flex items-center rounded-xl border border-border bg-surface transition-colors duration-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand/25 hover:border-border-strong">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          aria-label={label ?? placeholder}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="num w-full bg-transparent px-4 py-3.5 text-base font-medium text-foreground outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted/70 disabled:opacity-50"
        />
        <div className="flex shrink-0 items-center gap-2 pr-2.5">
          {unit && (
            <span className="text-xs font-semibold tracking-wide text-muted">{unit}</span>
          )}
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled}
              className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-ink transition-colors hover:bg-brand hover:text-white disabled:opacity-40"
            >
              Max
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-xl border border-border bg-surface px-4 py-3 pr-10 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/25"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Segmented option picker - used for lock durations, where seeing all the
 * choices at once (and what each one buys you) matters more than saving
 * vertical space.
 */
export function SegmentedOptions<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string; sublabel?: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border px-3 py-3 text-center transition-all duration-200 ease-out ${
                active
                  ? "border-brand bg-brand-soft shadow-xs"
                  : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  active ? "text-brand-ink" : "text-foreground"
                }`}
              >
                {opt.label}
              </span>
              {opt.sublabel && (
                <span className="mt-0.5 block text-[11px] text-muted">{opt.sublabel}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
