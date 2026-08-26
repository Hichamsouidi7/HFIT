"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Sheet, Toast } from "@/components/ui";
import { MEALS, currentMeal } from "@/lib/day";

export interface PantryItem {
  id: number;
  name: string;
  quantity: string | null;
  category: string | null;
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: { name: string; quantityG?: number; display: string }[];
  steps: string[];
  servings: number;
  kcalPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  carbsPerServing: number;
  prepMinutes: number | null;
  tags: { why?: string; missing?: string[] } | null;
  isFavorite: boolean;
}

/**
 * Fridge and recipe ideas.
 *
 * The pantry is not inventory management — it is the constraint that makes the
 * generated recipes usable tonight rather than "nice, but I'd have to shop".
 */
export function Kitchen({
  initialPantry,
  initialRecipes,
  kcalLeft,
  proteinLeft,
}: {
  initialPantry: PantryItem[];
  initialRecipes: Recipe[];
  kcalLeft: number;
  proteinLeft: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [pantry, setPantry] = useState(initialPantry);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function say(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }

  async function addToPantry() {
    // Commas and line breaks both split, so a whole shelf can be typed at once.
    const names = input
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    if (names.length === 0) return;

    setInput("");
    const res = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    if (res.ok) setPantry((p) => [...p, ...data.items]);
  }

  async function removeFromPantry(id: number) {
    setPantry((p) => p.filter((i) => i.id !== id));
    await fetch(`/api/pantry/${id}`, { method: "DELETE" });
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: currentMeal(), maxMinutes: 25 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Génération impossible.");
        return;
      }
      setRecipes((prev) => [...data.recipes, ...prev]);
      say(`${data.recipes.length} idées générées`);
    } catch {
      setError("Génération impossible. Vérifie ta connexion.");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleFavorite(recipe: Recipe) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: !r.isFavorite } : r)),
    );
    await fetch(`/api/recipes/${recipe.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "favorite" }),
    });
  }

  return (
    <>
      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-bold">Ce qu&apos;il te reste aujourd&apos;hui</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-sunken px-4 py-3">
            <p className="tnum text-[22px] font-bold">{kcalLeft}</p>
            <p className="text-[11px] text-muted">kcal disponibles</p>
          </div>
          <div className="rounded-2xl bg-accent-soft px-4 py-3">
            <p className="tnum text-[22px] font-bold text-accent">{proteinLeft} g</p>
            <p className="text-[11px] text-accent/80">protéines à atteindre</p>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={generate} disabled={generating}>
            {generating ? "L'IA cherche…" : "Trouver 3 idées de repas"}
          </Button>
        </div>

        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-faint">
          {pantry.length > 0
            ? `Uniquement avec les ${pantry.length} ingrédients de ton frigo.`
            : "Renseigne ton frigo en dessous pour n'avoir que des recettes faisables ce soir."}
        </p>

        {error && (
          <p className="mt-3 rounded-2xl bg-danger/10 p-3 text-center text-[12px] text-danger">
            {error}
          </p>
        )}
      </section>

      <h2 className="display mt-9 text-[1.35rem]">Mon frigo</h2>

      <section className="card mt-4 p-5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addToPantry()}
            placeholder="Poulet, oeufs, courgettes…"
            className="min-w-0 flex-1 rounded-2xl bg-sunken px-4 py-3 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
          />
          <Button variant="ink" size="sm" onClick={addToPantry} disabled={input.trim().length < 2}>
            Ajouter
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-faint">
          Sépare par des virgules pour en ajouter plusieurs d&apos;un coup.
        </p>

        {pantry.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pantry.map((item) => (
              <button
                key={item.id}
                onClick={() => removeFromPantry(item.id)}
                className="group flex items-center gap-1.5 rounded-full bg-sunken py-2 pl-3.5 pr-2.5 text-[12.5px] font-medium transition active:scale-95"
              >
                {item.name}
                <span className="text-faint group-active:text-danger">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <h2 className="display mt-9 text-[1.35rem]">Mes recettes</h2>

      <div className="mt-4 space-y-3">
        {recipes.length === 0 ? (
          <EmptyState
            title="Aucune recette pour l'instant"
            body="Renseigne ton frigo, puis demande 3 idées : elles n'utiliseront que ce que tu as."
          />
        ) : (
          recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => setOpen(recipe)}
              className="card w-full p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-snug">{recipe.name}</p>
                  {recipe.tags?.why && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">
                      {recipe.tags.why}
                    </p>
                  )}
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe);
                  }}
                  className={`shrink-0 rounded-full p-2 ${recipe.isFavorite ? "text-accent" : "text-faint"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={recipe.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 5.8-8.5 11.3-8.5 11.3Z" />
                  </svg>
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                <span className="tnum font-bold text-accent">
                  {recipe.proteinPerServing} g de protéines
                </span>
                <span className="tnum text-muted">{recipe.kcalPerServing} kcal</span>
                {recipe.prepMinutes ? (
                  <span className="tnum text-muted">{recipe.prepMinutes} min</span>
                ) : null}
                {recipe.tags?.missing && recipe.tags.missing.length > 0 && (
                  <span className="text-fat">manque {recipe.tags.missing.length} ingrédient(s)</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <RecipeSheet
        recipe={open}
        onClose={() => setOpen(null)}
        onLogged={(name) => {
          say(`${name} ajouté au journal`);
          startTransition(() => router.refresh());
        }}
      />

      <Toast message={toast} />
    </>
  );
}

function RecipeSheet({
  recipe,
  onClose,
  onLogged,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onLogged: (name: string) => void;
}) {
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState(currentMeal);
  const [busy, setBusy] = useState(false);

  async function log() {
    if (!recipe) return;
    setBusy(true);
    try {
      await fetch(`/api/recipes/${recipe.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log", meal, servings }),
      });
      onLogged(recipe.name);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!recipe) return null;

  return (
    <Sheet open onClose={onClose} title={recipe.name}>
      {recipe.tags?.why && (
        <p className="-mt-1 mb-4 rounded-2xl bg-accent-soft p-3.5 text-[12.5px] leading-relaxed text-accent">
          {recipe.tags.why}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2 text-center">
        <Cell label="kcal" value={Math.round(recipe.kcalPerServing * servings)} accent />
        <Cell label="prot." value={`${Math.round(recipe.proteinPerServing * servings)} g`} accent />
        <Cell label="lip." value={`${Math.round(recipe.fatPerServing * servings)} g`} />
        <Cell label="gluc." value={`${Math.round(recipe.carbsPerServing * servings)} g`} />
      </div>

      <h4 className="label mt-5">Ingrédients</h4>
      <ul className="mt-2 space-y-1.5">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className="flex justify-between gap-3 text-[13.5px]">
            <span>{ing.name}</span>
            <span className="tnum shrink-0 font-semibold text-muted">{ing.display}</span>
          </li>
        ))}
      </ul>

      {recipe.tags?.missing && recipe.tags.missing.length > 0 && (
        <p className="mt-3 rounded-2xl bg-fat/10 p-3 text-[12px] leading-relaxed text-fat">
          Il te manque : {recipe.tags.missing.join(", ")}.
        </p>
      )}

      <h4 className="label mt-5">Préparation</h4>
      <ol className="mt-2 space-y-2.5">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[13.5px] leading-snug">
            <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sunken text-[10px] font-bold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <h4 className="label mt-6">Ajouter au journal</h4>
      <div className="mt-2 flex gap-1.5 rounded-2xl bg-sunken p-1.5">
        {MEALS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMeal(m.id)}
            className={`flex-1 rounded-xl py-2 text-[12px] font-semibold transition ${
              meal === m.id ? "bg-white text-ink shadow-sm" : "text-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-sunken px-4 py-2.5">
        <span className="text-[12.5px] text-muted">Portions mangées</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
            className="h-8 w-8 rounded-full bg-white text-lg font-bold leading-none"
          >
            −
          </button>
          <span className="tnum w-8 text-center font-bold">{servings}</span>
          <button
            onClick={() => setServings((s) => Math.min(5, s + 0.5))}
            className="h-8 w-8 rounded-full bg-white text-lg font-bold leading-none"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 pb-2">
        <Button onClick={log} disabled={busy}>
          {busy ? "Ajout…" : "J'ai mangé ça"}
        </Button>
      </div>
    </Sheet>
  );
}

function Cell({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-sunken py-2.5">
      <div className={`tnum text-[15px] font-bold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}
