"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image";
import { Button, Sheet } from "@/components/ui";

interface Item {
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

interface Analysis {
  dish: string;
  confidence: string;
  note: string | null;
  items: Item[];
}

const MEALS = [
  { id: "petit-dejeuner", label: "Petit-déj" },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "diner", label: "Dîner" },
  { id: "collation", label: "Collation" },
];

function currentMeal(): string {
  const h = new Date().getHours();
  if (h < 11) return "petit-dejeuner";
  if (h < 15) return "dejeuner";
  if (h < 18) return "collation";
  return "diner";
}

/**
 * Photograph a plate, get an editable breakdown.
 *
 * The estimate is always shown as a list of separate, adjustable items rather
 * than one number: it makes the guess auditable, and correcting the one item
 * that is wrong costs a tap instead of throwing the whole thing away.
 */
export function MealPhoto({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [meal, setMeal] = useState(currentMeal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setAnalysis(null);

    try {
      const compressed = await compressImage(file);
      setPreview(compressed.dataUrl);

      const res = await fetch("/api/food/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed.dataUrl, mimeType: compressed.mimeType }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analyse impossible.");
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError("Aucun aliment reconnu sur cette photo. Essaie un angle plus large.");
        return;
      }

      setAnalysis(data);
      setItems(data.items);
    } catch {
      setError("Impossible de traiter cette photo.");
    } finally {
      setBusy(false);
    }
  }

  /** Rescaling one item keeps its macro density and only changes the weight. */
  function setQuantity(index: number, grams: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const ratio = grams / (item.quantityG || 1);
        return {
          ...item,
          quantityG: grams,
          kcal: Math.round(item.kcal * ratio),
          proteinG: Math.round(item.proteinG * ratio),
          fatG: Math.round(item.fatG * ratio),
          carbsG: Math.round(item.carbsG * ratio),
        };
      }),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, meal, aiEstimated: true }),
      });
      close();
      router.refresh();
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setAnalysis(null);
    setItems([]);
    setPreview(null);
    setError(null);
  }

  const totals = items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      proteinG: acc.proteinG + i.proteinG,
      fatG: acc.fatG + i.fatG,
      carbsG: acc.carbsG + i.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="card-accent flex w-full items-center gap-3.5 p-4 text-left transition active:scale-[0.99] disabled:opacity-60"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <CameraIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold">
            {busy && !analysis ? "Analyse en cours…" : "Photographier mon assiette"}
          </span>
          <span className="block text-[12px] text-white/80">
            {busy && !analysis ? "quelques secondes" : "l'IA estime les aliments et les macros"}
          </span>
        </span>
      </button>

      {error && !analysis && (
        <p className="mt-3 rounded-2xl bg-danger/10 p-3.5 text-center text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      <Sheet open={Boolean(analysis)} onClose={close} title={analysis?.dish ?? "Analyse"}>
        {preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt="Ton assiette"
            className="mb-4 h-40 w-full rounded-2xl object-cover"
          />
        )}

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

        <div className="mt-4 space-y-2.5">
          {items.map((item, i) => (
            <div key={`${item.name}-${i}`} className="rounded-2xl bg-sunken p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[14px] font-semibold">{item.name}</p>
                <button
                  onClick={() => removeItem(i)}
                  aria-label={`Retirer ${item.name}`}
                  className="shrink-0 rounded-full bg-white px-2 py-1.5 text-muted"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={Math.max(400, item.quantityG * 2)}
                  step={5}
                  value={item.quantityG}
                  onChange={(e) => setQuantity(i, Number(e.target.value))}
                  className="h-1.5 min-w-0 flex-1 accent-[var(--color-accent)]"
                />
                <span className="tnum w-16 shrink-0 text-right text-[13px] font-bold">
                  {item.quantityG} g
                </span>
              </div>

              <p className="tnum mt-1.5 text-[11px] text-muted">
                {item.kcal} kcal · {item.proteinG} P / {item.fatG} L / {item.carbsG} G
              </p>
            </div>
          ))}
        </div>

        {analysis?.note && (
          <p className="mt-3 rounded-2xl bg-accent-soft p-3 text-[11.5px] leading-relaxed text-accent">
            {analysis.note}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Total label="kcal" value={totals.kcal} accent />
          <Total label="prot." value={`${totals.proteinG} g`} accent />
          <Total label="lip." value={`${totals.fatG} g`} />
          <Total label="gluc." value={`${totals.carbsG} g`} />
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
          {/* Set expectations once, here, rather than letting him discover it. */}
          C&apos;est une estimation. Ajuste les curseurs si une quantité te paraît fausse — mieux
          vaut un chiffre approché tous les jours qu&apos;un chiffre exact abandonné au jour 4.
        </p>

        <div className="mt-4 pb-2">
          <Button onClick={save} disabled={busy || items.length === 0}>
            {busy ? "Ajout…" : `Ajouter ${items.length} aliment${items.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function Total({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-sunken py-2.5">
      <div className={`tnum text-[15px] font-bold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.6a2 2 0 0 0 1.7-1l.5-.8a2 2 0 0 1 1.7-1h3a2 2 0 0 1 1.7 1l.5.8a2 2 0 0 0 1.7 1H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
