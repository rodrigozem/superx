type IconProps = { className?: string };

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function TvIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="m17 2-5 5-5-5" />
    </svg>
  );
}

export function MaximizeIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function MinimizeIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
