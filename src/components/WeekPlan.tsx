"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Segmented, Toast } from "@/components/ui";

interface PlannedMeal {
  meal: string;
  name: string;
  quickNote: string | null;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface PlanData {
  days: { weekday: string; meals: PlannedMeal[] }[];
  batches: { name: string; quantity: string; covers: string }[];
  targets: { kcal: number; proteinG: number; fatG: number; carbsG: number };
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string | null;
  aisle: string | null;
  checked: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};

const MEAL_ORDER = ["petit-dejeuner", "dejeuner", "collation", "diner"];

type Tab = "plan" | "prep" | "courses";

export function WeekPlan({
  initialPlan,
  initialShopping,
}: {
  initialPlan: PlanData | null;
  initialShopping: ShoppingItem[];
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [shopping, setShopping] = useState(initialShopping);
  const [tab, setTab] = useState<Tab>("plan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mealplan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Génération impossible.");
        return;
      }
      setPlan(data.plan.plan);
      setShopping(data.shopping);
      setToast("Plan de la semaine prêt");
      setTimeout(() => setToast(null), 2600);
      router.refresh();
    } catch {
      setError("Génération impossible. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ShoppingItem) {
    setShopping((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    );
    await fetch(`/api/shopping/${item.id}`, { method: "POST" });
  }

  if (!plan) {
    return (
      <>
        <EmptyState
          title="Pas encore de plan cette semaine"
          body="Sept jours de repas construits autour de 3 ou 4 préparations à cuisiner d'un coup, avec la liste de courses qui va avec."
          action={
            <Button onClick={generate} disabled={busy}>
              {busy ? "L'IA construit le plan…" : "Générer le plan de la semaine"}
            </Button>
          }
        />
        {error && (
          <p className="mt-3 rounded-2xl bg-danger/10 p-3.5 text-center text-[12.5px] leading-relaxed text-danger">
            {error}
          </p>
        )}
        <Toast message={toast} />
      </>
    );
  }

  const remaining = shopping.filter((i) => !i.checked).length;
  const byAisle = groupBy(shopping, (i) => i.aisle ?? "Divers");

  return (
    <>
      <Segmented
        options={[
          { id: "plan" as Tab, label: "Les repas" },
          { id: "prep" as Tab, label: "À cuisiner" },
          { id: "courses" as Tab, label: `Courses${remaining > 0 ? ` (${remaining})` : ""}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "plan" && (
        <div className="mt-5 space-y-4">
          {plan.days.map((day) => {
            const totals = day.meals.reduce(
              (acc, m) => ({
                kcal: acc.kcal + m.kcal,
                proteinG: acc.proteinG + m.proteinG,
              }),
              { kcal: 0, proteinG: 0 },
            );

            return (
              <section key={day.weekday} className="card overflow-hidden">
                <header className="flex items-baseline justify-between gap-3 px-4 pt-4">
                  <h3 className="text-[14px] font-bold capitalize">{day.weekday}</h3>
                  <span className="tnum text-[11px] text-muted">
                    {totals.kcal} kcal · {totals.proteinG} g P
                  </span>
                </header>

                <ul className="mt-2 divide-y divide-line">
                  {[...day.meals]
                    .sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal))
                    .map((meal, i) => (
                      <li key={i} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 text-[13.5px] font-semibold">{meal.name}</p>
                          <span className="tnum shrink-0 text-[11px] text-muted">
                            {meal.kcal} kcal
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-faint">
                          {MEAL_LABELS[meal.meal] ?? meal.meal}
                          {meal.quickNote && ` · ${meal.quickNote}`}
                        </p>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {tab === "prep" && (
        <div className="mt-5">
          <p className="mb-4 rounded-2xl bg-accent-soft p-4 text-[12.5px] leading-relaxed text-accent">
            Cuisine tout ça d&apos;un coup — deux heures le dimanche, et la semaine ne dépend plus
            de ta motivation du soir.
          </p>
          <ul className="space-y-2.5">
            {plan.batches.map((batch, i) => (
              <li key={i} className="card-solid p-4">
                <div className="flex items-start gap-3">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">{batch.name}</p>
                    <p className="tnum mt-0.5 text-[12px] font-medium text-accent">
                      {batch.quantity}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-snug text-muted">{batch.covers}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "courses" && (
        <div className="mt-5 space-y-4">
          {Object.entries(byAisle).map(([aisle, items]) => (
            <section key={aisle} className="card overflow-hidden">
              <h3 className="px-4 pt-4 text-[12px] font-bold uppercase tracking-wide text-muted">
                {aisle}
              </h3>
              <ul className="mt-1.5 divide-y divide-line">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          item.checked ? "border-accent bg-accent" : "border-line"
                        }`}
                      >
                        {item.checked && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12.5 4.5 4.5L19 7" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-[13.5px] ${item.checked ? "text-faint line-through" : "font-medium"}`}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="tnum shrink-0 text-[11.5px] text-muted">
                          {item.quantity}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-7">
        <Button variant="ghost" onClick={generate} disabled={busy}>
          {busy ? "Génération…" : "Regénérer le plan"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-danger/10 p-3.5 text-center text-[12.5px] text-danger">
          {error}
        </p>
      )}

      <Toast message={toast} />
    </>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}
