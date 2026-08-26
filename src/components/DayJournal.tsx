"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Entry {
  id: number;
  meal: string;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  aiEstimated: boolean;
}

const MEAL_ORDER = ["petit-dejeuner", "dejeuner", "collation", "diner"];
const MEAL_LABELS: Record<string, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};

export function DayJournal({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<number | null>(null);

  async function remove(id: number) {
    setDeleting(id);
    try {
      await fetch(`/api/entries/${id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setDeleting(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[14px] font-semibold">Rien de logué aujourd&apos;hui</p>
        <p className="mt-1 text-[12px] text-muted">
          Commence par ta source de protéines, c&apos;est elle qui structure la journée.
        </p>
      </div>
    );
  }

  const groups = MEAL_ORDER.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const kcal = group.items.reduce((s, e) => s + e.kcal, 0);
        const protein = group.items.reduce((s, e) => s + e.proteinG, 0);

        return (
          <section key={group.meal} className="card overflow-hidden">
            <header className="flex items-baseline justify-between px-4 pt-4">
              <h3 className="text-[13px] font-bold">{MEAL_LABELS[group.meal]}</h3>
              <span className="tnum text-[11px] text-muted">
                {Math.round(kcal)} kcal · {Math.round(protein)} g prot.
              </span>
            </header>

            <ul className="mt-2 divide-y divide-line">
              {group.items.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">
                      {entry.name}
                      {entry.aiEstimated && (
                        <span className="ml-1.5 text-[10px] font-semibold text-accent">estimé</span>
                      )}
                    </p>
                    <p className="tnum truncate text-[11px] text-muted">
                      {Math.round(entry.quantityG)} g · {Math.round(entry.kcal)} kcal ·{" "}
                      {Math.round(entry.proteinG)} P / {Math.round(entry.fatG)} L /{" "}
                      {Math.round(entry.carbsG)} G
                    </p>
                  </div>
                  <button
                    onClick={() => remove(entry.id)}
                    disabled={deleting === entry.id}
                    aria-label={`Supprimer ${entry.name}`}
                    className="shrink-0 rounded-full bg-sunken px-2.5 py-2 text-muted transition active:scale-90 disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
