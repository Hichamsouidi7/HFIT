"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * The four circular pucks under the hero card.
 *
 * Two navigate, two act in place. The whole point is that logging water or
 * pulling steps never costs a screen change - one tap, the number moves.
 */
export function QuickActions({ waterStepMl = 250 }: { waterStepMl?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function post(url: string, body: unknown, key: string, message: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setToast(res.ok ? message : "Échec, réessaie.");
      startTransition(() => router.refresh());
    } catch {
      setToast("Pas de connexion.");
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 2200);
    }
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-3">
        <Puck label="Repas" onClick={() => router.push("/manger")} icon={<MealIcon />} />
        <Puck label="Séance" onClick={() => router.push("/bouger")} icon={<DumbbellIcon />} />
        <Puck
          label="Eau"
          busy={busy === "water"}
          onClick={() => post("/api/water", { addMl: waterStepMl }, "water", `+${waterStepMl} ml d'eau`)}
          icon={<DropIcon />}
        />
        <Puck
          label="Sync"
          busy={busy === "sync" || pending}
          onClick={() => router.push("/reglages/sante")}
          icon={<SyncIcon />}
        />
      </div>

      {toast && (
        <div className="animate-pop pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

function Puck({
  label,
  icon,
  onClick,
  busy,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex flex-col items-center gap-2 disabled:opacity-50"
    >
      <span className="puck flex h-14 w-14 items-center justify-center text-ink transition active:scale-95">
        {busy ? <Spinner /> : icon}
      </span>
      <span className="text-[11px] font-medium text-muted">{label}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ic = {
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MealIcon() {
  return (
    <svg {...ic}>
      <path d="M5.5 3v7a2 2 0 0 0 4 0V3" />
      <path d="M7.5 12v9" />
      <path d="M17.5 3c-1.6 1.3-2.4 3.1-2.4 5.5s.8 3.5 2.4 3.5v9" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg {...ic}>
      <path d="M7 7v10" />
      <path d="M17 7v10" />
      <path d="M4 10v4" />
      <path d="M20 10v4" />
      <path d="M7 12h10" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg {...ic}>
      <path d="M12 3s6 6.1 6 10a6 6 0 0 1-12 0c0-3.9 6-10 6-10Z" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg {...ic}>
      <path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.5" />
      <path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M4 20v-4.5h4.5" />
    </svg>
  );
}
