"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
  defaultPortionG: number;
  portionLabel: string | null;
}

const MEALS = [
  { id: "petit-dejeuner", label: "Petit-déj" },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "diner", label: "Dîner" },
  { id: "collation", label: "Collation" },
];

/** Meal suggested from the time of day, so the right tab is usually preselected. */
function currentMeal(): string {
  const h = new Date().getHours();
  if (h < 11) return "petit-dejeuner";
  if (h < 15) return "dejeuner";
  if (h < 18) return "collation";
  return "diner";
}

export function FoodSearch() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [meal, setMeal] = useState(currentMeal);
  const [grams, setGrams] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Debounced so typing does not fire a request per keystroke.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.foods ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const f = Number(grams) / 100;
    if (!Number.isFinite(f) || f <= 0) return null;
    return {
      kcal: Math.round(selected.kcal100 * f),
      protein: Math.round(selected.protein100 * f),
      fat: Math.round(selected.fat100 * f),
      carbs: Math.round(selected.carbs100 * f),
    };
  }, [selected, grams]);

  function pick(food: Food) {
    setSelected(food);
    setGrams(String(Math.round(food.defaultPortionG)));
  }

  async function add() {
    if (!selected || !preview) return;
    setSaving(true);
    try {
      await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: selected.id, quantityG: Number(grams), meal }),
      });
      setSelected(null);
      setQuery("");
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un aliment…"
          className="card w-full px-4 py-3.5 pr-10 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-faint">…</span>
        )}
      </div>

      {results.length === 0 && !loading && (
        <p className="mt-4 text-center text-[13px] text-faint">
          {query.length >= 2
            ? "Aucun aliment trouvé."
            : "Tape au moins 2 lettres, ou choisis dans tes habitudes."}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {results.map((food) => (
          <li key={food.id}>
            <button
              onClick={() => pick(food)}
              className="card flex w-full items-center gap-3 p-3.5 text-left transition active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{food.name}</p>
                <p className="truncate text-[11px] text-muted">
                  {food.brand ? `${food.brand} · ` : ""}
                  {Math.round(food.kcal100)} kcal · {Math.round(food.protein100)} g de protéines
                  <span className="text-faint"> / 100 g</span>
                </p>
              </div>
              <span className="shrink-0 text-lg font-semibold text-accent">+</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 px-3 pb-3 backdrop-blur-[2px]">
          <div className="animate-pop card w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[17px] font-bold">{selected.name}</h3>
                {selected.brand && (
                  <p className="truncate text-[12px] text-muted">{selected.brand}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 rounded-full bg-sunken px-3 py-1.5 text-[11px] font-semibold text-ink-soft"
              >
                Annuler
              </button>
            </div>

            <div className="mt-4 flex gap-1.5 rounded-2xl bg-sunken p-1.5">
              {MEALS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMeal(m.id)}
                  className={`flex-1 rounded-xl py-2 text-[12px] font-semibold transition ${
                    meal === m.id ? "bg-card text-ink shadow-sm" : "text-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-2xl bg-sunken px-4">
                <input
                  type="number"
                  inputMode="decimal"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="tnum w-full bg-transparent py-3 text-xl font-bold outline-none"
                />
                <span className="ml-1 text-sm text-faint">g</span>
              </div>
              {[50, 100, 150].map((g) => (
                <button
                  key={g}
                  onClick={() => setGrams(String(g))}
                  className="rounded-2xl bg-sunken px-3 py-3 text-[12px] font-semibold text-ink-soft"
                >
                  {g}
                </button>
              ))}
            </div>

            {preview && (
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <Cell label="kcal" value={preview.kcal} accent />
                <Cell label="prot." value={`${preview.protein} g`} accent />
                <Cell label="lip." value={`${preview.fat} g`} />
                <Cell label="gluc." value={`${preview.carbs} g`} />
              </div>
            )}

            <button
              onClick={add}
              disabled={saving || !preview}
              className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
            >
              {saving ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-sunken py-2.5">
      <div className={`tnum text-[15px] font-bold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}
