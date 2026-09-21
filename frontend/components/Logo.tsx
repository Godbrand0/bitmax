import Link from "next/link";

/**
 * BitMax mark: three stacked layers (the "stacking" in Stacking DAO / sBTC)
 * rising into a gold gradient, with the top layer offset to suggest growth.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="bm-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFC067" />
          <stop offset="55%" stopColor="#F7931A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#bm-grad)" />
      <path
        d="M16 6.5 24.5 11 16 15.5 7.5 11 16 6.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M9.6 14.2 16 17.6l6.4-3.4"
        stroke="white"
        strokeOpacity="0.72"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 19.1 16 22.5l6.4-3.4"
        stroke="white"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-2.5"
      aria-label="BitMax home"
    >
      <span className="transition-transform duration-300 ease-spring group-hover:rotate-[-8deg] group-hover:scale-105">
        <LogoMark size={size} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-foreground">
        Bit<span className="text-brand">Max</span>
      </span>
    </Link>
  );
}
