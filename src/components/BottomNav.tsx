"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating dark pill, matching the reference: the active tab becomes a white
 * chip with its label, the others stay as bare icons.
 *
 * Four tabs, and the plan says never more than four. The lesson carried over
 * from the English-tutor project: the moment an app grows a fifth menu entry it
 * stops being a path and becomes a drawer of tools. Anything new has to be
 * reachable from inside one of these four.
 */
const TABS = [
  { href: "/", label: "Jour", icon: TodayIcon },
  { href: "/manger", label: "Manger", icon: EatIcon },
  { href: "/bouger", label: "Bouger", icon: MoveIcon },
  { href: "/progres", label: "Progrès", icon: ProgressIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-ink p-1.5 shadow-[0_10px_30px_-6px_rgb(0_0_0/0.35)]">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full transition-all duration-200 ${
                active
                  ? "bg-card px-4 py-2.5 text-ink"
                  : "px-3.5 py-2.5 text-white/55 active:text-white"
              }`}
            >
              <Icon />
              {active && <span className="text-[13px] font-semibold">{tab.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TodayIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

function EatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5.5 3v7a2 2 0 0 0 4 0V3" />
      <path d="M7.5 12v9" />
      <path d="M17.5 3c-1.6 1.3-2.4 3.1-2.4 5.5s.8 3.5 2.4 3.5v9" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 7v10" />
      <path d="M17 7v10" />
      <path d="M4 10v4" />
      <path d="M20 10v4" />
      <path d="M7 12h10" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 17.5 9.5 11l3.5 3.5L20 6.5" />
      <path d="M15 6.5h5v5" />
    </svg>
  );
}
