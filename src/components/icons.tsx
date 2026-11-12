import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function base(active?: boolean) {
  return {
    className: "w-5 h-5",
    fill: "none",
    stroke: active ? "#2563eb" : "#94a3b8",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
}

export function OffersIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12h8M8 8h5M8 16h3" />
    </svg>
  );
}

export function NotificationsIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M15 17H5a2 2 0 0 1-1.4-3.4L5 12V9a7 7 0 0 1 14 0v3l1.4 1.6A2 2 0 0 1 19 17h-4" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function FavoritesIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M5 3h14a2 2 0 0 1 2 2v16l-9-4-9 4V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function ApplicationsIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
    </svg>
  );
}

export function ProfileIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function DashboardIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function VacanciesIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </svg>
  );
}

export function ApplicantsIcon({ active, ...props }: IconProps) {
  return (
    <svg {...base(active)} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18 20c0-2.6-.8-4.6-2.2-6" />
    </svg>
  );
}
