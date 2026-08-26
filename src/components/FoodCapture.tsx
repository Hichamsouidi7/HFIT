"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { MealPhoto } from "@/components/MealPhoto";
import { Button, Sheet, Toast } from "@/components/ui";
import { MEALS, currentMeal } from "@/lib/day";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
  defaultPortionG: number;
  isFavorite?: boolean;
}


/**
 * Everything that puts food into the diary, in one place.
 *
 * Four routes in, ordered by how little effort each costs: photograph the
 * plate, scan a barcode, tap something eaten before, or search. Logging is the
 * habit that breaks first, so the cheap paths come first on the screen.
 */
export function FoodCapture({ usual }: { usual: UsualItem[] }) {
  const [scanning, setScanning] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function say(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <MealPhoto onDone={() => say("Repas ajouté")} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ActionCard
          label="Scanner"
          hint="code-barres produit"
          icon={<ScanIcon />}
          onClick={() => setScanning(true)}
        />
        <ActionCard
          label="Chercher"
          hint="2 313 aliments"
          icon={<SearchIcon />}
          onClick={() => setSearchOpen(true)}
        />
      </div>

      {usual.length > 0 && (
        <section className="mt-6">
          <h3 className="label mb-2.5">Tes habitudes</h3>
          <QuickAdd items={usual} onAdded={(n) => say(`${n} ajouté`)} />
        </section>
      )}

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onDetected={async (code) => {
            setScanning(false);
            const res = await fetch(`/api/foods/barcode/${code}`);
            const data = await res.json();
            if (!res.ok) {
              say(data.error ?? "Produit introuvable");
              setCreateOpen(true);
              return;
            }
            setSelected(data.food);
          }}
        />
      )}

      <FoodSearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(food) => {
          setSearchOpen(false);
          setSelected(food);
        }}
        onCreate={() => {
          setSearchOpen(false);
          setCreateOpen(true);
        }}
      />

      {selected && (
        <PortionSheet
          key={selected.id}
          food={selected}
          onClose={() => setSelected(null)}
          onAdded={(name) => say(`${name} ajouté`)}
        />
      )}

      <CreateFoodSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(food) => {
          setCreateOpen(false);
          setSelected(food);
        }}
      />

      <Toast message={toast} />
    </>
  );
}

function ActionCard({
  label,
  hint,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card p-4 text-left transition active:scale-[0.98]">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sunken text-ink">
        {icon}
      </span>
      <span className="mt-3 block text-[14.5px] font-bold">{label}</span>
      <span className="block text-[11.5px] text-muted">{hint}</span>
    </button>
  );
}

export interface UsualItem {
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  times: number;
}

/** One-tap re-log of something eaten repeatedly, at the same portion. */
function QuickAdd({
  items,
  onAdded,
}: {
  items: UsualItem[];
  onAdded: (name: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function add(item: UsualItem) {
    setBusy(item.name);
    try {
      await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [item],
          meal: currentMeal(),
          aiEstimated: false,
        }),
      });
      onAdded(item.name);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-bar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => add(item)}
          disabled={busy === item.name}
          className="card-solid w-40 shrink-0 p-3.5 text-left transition active:scale-95 disabled:opacity-50"
        >
          <p className="truncate text-[13px] font-semibold">{item.name}</p>
          <p className="tnum mt-1 text-[11px] text-muted">
            {Math.round(item.quantityG)} g · {Math.round(item.kcal)} kcal
          </p>
          <p className="tnum mt-0.5 text-[11px] font-semibold text-accent">
            {Math.round(item.proteinG)} g de protéines
          </p>
        </button>
      ))}
    </div>
  );
}

function FoodSearchSheet({
  open,
  onClose,
  onPick,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (food: Food) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
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
  }, [query, open]);

  return (
    <Sheet open={open} onClose={onClose} title="Chercher un aliment">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Poulet, riz, skyr…"
        autoFocus
        className="w-full rounded-2xl bg-sunken px-4 py-3.5 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
      />

      {loading && (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-[13px] text-muted">
            {query.length >= 2 ? "Aucun aliment trouvé." : "Tape au moins 2 lettres."}
          </p>
          <button onClick={onCreate} className="mt-3 text-[13px] font-semibold text-accent">
            Créer l&apos;aliment moi-même
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <ul className="mt-3 space-y-2">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  onClick={() => onPick(food)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-sunken p-3.5 text-left transition active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{food.name}</p>
                    <p className="tnum truncate text-[11px] text-muted">
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
          <button
            onClick={onCreate}
            className="mt-4 w-full pb-2 text-center text-[13px] font-semibold text-muted"
          >
            Pas dans la liste ? Créer l&apos;aliment
          </button>
        </>
      )}
    </Sheet>
  );
}

function PortionSheet({
  food,
  onClose,
  onAdded,
}: {
  food: Food;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const router = useRouter();
  // Mounted per food (see the key at the call site), so the defaults come from
  // the initial state rather than an effect copying props into state.
  const [grams, setGrams] = useState(() => String(Math.round(food.defaultPortionG || 100)));
  const [meal, setMeal] = useState(currentMeal);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const factor = Number(grams) / 100;
    if (!Number.isFinite(factor) || factor <= 0) return null;
    return {
      kcal: Math.round(food.kcal100 * factor),
      protein: Math.round(food.protein100 * factor),
      fat: Math.round(food.fat100 * factor),
      carbs: Math.round(food.carbs100 * factor),
    };
  }, [food, grams]);

  async function add() {
    setBusy(true);
    try {
      await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: food.id, quantityG: Number(grams), meal }),
      });
      onAdded(food.name);
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={food.name}>
      {food.brand && <p className="-mt-1 mb-3 text-[12px] text-muted">{food.brand}</p>}

      <div className="flex gap-1.5 rounded-2xl bg-sunken p-1.5">
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
        {[30, 100, 150, 200].map((g) => (
          <button
            key={g}
            onClick={() => setGrams(String(g))}
            className="rounded-2xl bg-sunken px-2.5 py-3 text-[12px] font-semibold text-ink-soft"
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

      <div className="mt-4 pb-2">
        <Button onClick={add} disabled={busy || !preview}>
          {busy ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </Sheet>
  );
}

function CreateFoodSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (food: Food) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The label gives macros; energy follows from them, so it is computed rather
  // than asked for — one less field, and it can never contradict the macros.
  const computedKcal = useMemo(() => {
    const p = Number(protein) || 0;
    const f = Number(fat) || 0;
    const c = Number(carbs) || 0;
    return Math.round(p * 4 + f * 9 + c * 4);
  }, [protein, fat, carbs]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kcal100: Number(kcal) || computedKcal,
          protein100: Number(protein) || 0,
          fat100: Number(fat) || 0,
          carbs100: Number(carbs) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Création impossible.");
        return;
      }
      setName("");
      setKcal("");
      setProtein("");
      setFat("");
      setCarbs("");
      onCreated(data.food);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Créer un aliment">
      <p className="-mt-1 mb-4 text-[12px] leading-relaxed text-muted">
        Recopie les valeurs <strong>pour 100 g</strong> de l&apos;étiquette. Il sera ensuite dans ta
        recherche et dans tes favoris.
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'aliment"
        className="w-full rounded-2xl bg-sunken px-4 py-3.5 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
      />

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Field label="Protéines" value={protein} onChange={setProtein} />
        <Field label="Lipides" value={fat} onChange={setFat} />
        <Field label="Glucides" value={carbs} onChange={setCarbs} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-sunken px-4 py-3">
        <span className="text-[12px] text-muted">Calories calculées</span>
        <span className="tnum text-[15px] font-bold text-accent">{computedKcal} kcal</span>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[12px] text-muted">
          L&apos;étiquette indique d&apos;autres calories ?
        </summary>
        <Field label="Calories forcées" value={kcal} onChange={setKcal} className="mt-2" />
      </details>

      {error && <p className="mt-3 text-center text-[12.5px] text-danger">{error}</p>}

      <div className="mt-4 pb-2">
        <Button onClick={create} disabled={busy || name.trim().length < 2}>
          {busy ? "Création…" : "Créer et ajouter"}
        </Button>
      </div>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <div className="flex items-center rounded-2xl bg-sunken px-3">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="tnum w-full bg-transparent py-2.5 font-semibold outline-none placeholder:text-faint"
        />
        <span className="ml-1 text-[11px] text-faint">g</span>
      </div>
    </label>
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

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
      <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
      <path d="M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16" />
      <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
      <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
