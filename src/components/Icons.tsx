// Inline stroke icons that inherit the current text colour, so they stay
// visible on any button background (the old PNG action icons were white).
type IconProps = { className?: string };

const base = (className = "w-4 h-4") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const EyeIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const PencilIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const TrashIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);
export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>
);
export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const SearchIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const SortAscIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M3 6h7M3 12h5M3 18h3" /><path d="M17 20V4M13 8l4-4 4 4" /></svg>
);
export const SortDescIcon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M3 6h3M3 12h5M3 18h7" /><path d="M17 4v16M13 16l4 4 4-4" /></svg>
);
