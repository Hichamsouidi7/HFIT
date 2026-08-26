"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Page title with an optional back arrow. Every screen starts with one. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="pt-10">
      {back && (
        <Link href={back} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Retour
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-[2.3rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function SectionTitle({
  children,
  action,
  className = "",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="display text-[1.35rem]">{children}</h2>
      {action}
    </div>
  );
}

type ButtonVariant = "accent" | "ink" | "soft" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  accent:
    "bg-accent text-white shadow-[0_8px_22px_-8px_rgb(233_99_60/0.6)] active:shadow-none",
  ink: "bg-ink text-white",
  soft: "bg-white/70 text-ink backdrop-blur-xl shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_14px_-6px_rgb(20_20_30/0.2)]",
  ghost: "bg-sunken text-ink-soft",
};

export function Button({
  children,
  variant = "accent",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  const sizing = size === "sm" ? "px-4 py-2.5 text-[13px]" : "w-full py-4 text-[15px]";
  return (
    <button
      {...props}
      className={`rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-35 disabled:active:scale-100 ${BUTTON_STYLES[variant]} ${sizing} ${className}`}
    >
      {children}
    </button>
  );
}

/** Horizontal pill selector. Used for meals, muscle groups, filters. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-bar -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 ${
            value === o.id
              ? "bg-ink text-white"
              : "bg-white/65 text-ink-soft backdrop-blur-xl shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented control, for two or three mutually exclusive choices. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 rounded-2xl bg-sunken p-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition ${
            value === o.id ? "bg-white text-ink shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Bottom sheet. Locks the page behind it and closes on the backdrop or Escape,
 * which is what people expect from a sheet on a phone.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling while the sheet is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
      />
      <div
        className="animate-sheet relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-white/95 backdrop-blur-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_-12px_rgb(20_20_30/0.3)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/85 px-5 pb-3 pt-4 backdrop-blur-xl">
          <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-line" />
          <h3 className="mt-2 min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="mt-2 shrink-0 rounded-full bg-sunken px-3 py-1.5 text-[11px] font-semibold text-ink-soft"
          >
            Fermer
          </button>
        </div>
        <div className="px-5 pt-1">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card px-6 py-9 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-[12.5px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Small toast anchored to the bottom, above the nav. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-pop pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-5">
      <span className="card-ink rounded-full px-4 py-2.5 text-[12.5px] font-medium">{message}</span>
    </div>
  );
}

/** Navigates back and refreshes the server components behind it. */
export function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}
