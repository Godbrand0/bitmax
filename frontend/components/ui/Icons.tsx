/**
 * One coherent icon set: 24px box, 1.75 stroke, round caps. Presentational
 * only and directive-free, so both server and client components can use them.
 */

type IconProps = { size?: number; className?: string };

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const DepositIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v11" />
    <path d="M7.5 9.5 12 14l4.5-4.5" />
    <path d="M4 18.5h16" />
  </Svg>
);

export const EarnIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 17l5.5-5.5 3.5 3.5L20 7" />
    <path d="M14.5 7H20v5.5" />
  </Svg>
);

export const BoostIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2.5 5 13.5h5.5L9 21.5l8-11h-5.5l1.5-8Z" />
  </Svg>
);

export const BorrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9.5 3.5 13 7 16.5" />
    <path d="M3.5 13h12a4.5 4.5 0 0 0 4.5-4.5" />
    <path d="M17 4.5 20.5 8 17 11.5" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2l6.8 2.6v5.5c0 4.3-2.9 7.3-6.8 8.5-3.9-1.2-6.8-4.2-6.8-8.5V5.8L12 3.2Z" />
    <path d="M9.4 12.1l1.9 1.9 3.4-3.4" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <path d="M12 14.5v2" />
  </Svg>
);

export const WalletIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18" />
    <path d="M16.5 14.5h1.5" />
  </Svg>
);

export const BitcoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 7.8h3.6a2.1 2.1 0 0 1 0 4.2H9.6V7.8Z" />
    <path d="M9.6 12h4a2.1 2.1 0 0 1 0 4.2h-4V12Z" />
    <path d="M11 6v1.8M13.2 6v1.8M11 16.2V18M13.2 16.2V18" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15" />
    <path d="M13.5 6l6 6-6 6" />
  </Svg>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.5v15" />
    <path d="M6 13.5l6 6 6-6" />
  </Svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19.5v-15" />
    <path d="M6 10.5l6-6 6 6" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6.5 9.5 17 4 11.5" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8v.7" />
  </Svg>
);

export const DisconnectIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 20.5H6a2.5 2.5 0 0 1-2.5-2.5v-12A2.5 2.5 0 0 1 6 3.5h3.5" />
    <path d="M16 8.5l4 3.5-4 3.5" />
    <path d="M20 12H9.5" />
  </Svg>
);

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5 11 13" />
    <path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Svg>
);

export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
    <path d="M3.5 13 12 17.5 20.5 13" />
  </Svg>
);

export const ChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M21.5 20h-19" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <path d="M12 7.8v.4" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4" />
    <path d="M12 16.8v.4" />
  </Svg>
);
