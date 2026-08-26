"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Segmented, Toast } from "@/components/ui";
import { dailyPlan, projection, type Aggressiveness, type Profile } from "@/lib/nutrition";

export interface SettingsProfile {
  sex: string;
  age: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  bodyFatPct: number | null;
  aggressiveness: string;
  stepsGoal: number;
  waterGoalMl: number;
  allergies: string | null;
  dislikedFoods: string | null;
}

const LEVELS: { id: Aggressiveness; label: string }[] = [
  { id: "moderate", label: "Modéré" },
  { id: "aggressive", label: "Agressif" },
  { id: "extreme", label: "Extrême" },
];

export function Settings({
  profile: initial,
  currentWeightKg,
}: {
  profile: SettingsProfile;
  currentWeightKg: number;
}) {
  const router = useRouter();

  const [age, setAge] = useState(String(initial.age));
  const [heightCm, setHeightCm] = useState(String(initial.heightCm));
  const [targetWeightKg, setTargetWeightKg] = useState(String(initial.targetWeightKg));
  const [bodyFatPct, setBodyFatPct] = useState(
    initial.bodyFatPct != null ? String(initial.bodyFatPct) : "",
  );
  const [aggressiveness, setAggressiveness] = useState(
    initial.aggressiveness as Aggressiveness,
  );
  const [stepsGoal, setStepsGoal] = useState(String(initial.stepsGoal));
  const [waterGoalMl, setWaterGoalMl] = useState(String(initial.waterGoalMl));
  const [allergies, setAllergies] = useState(initial.allergies ?? "");
  const [dislikedFoods, setDislikedFoods] = useState(initial.dislikedFoods ?? "");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live preview, same engine as the onboarding screen: changing the intensity
  // should show what it does before it is saved, not after.
  const preview = useMemo(() => {
    const p: Profile = {
      sex: initial.sex === "female" ? "female" : "male",
      age: Number(age) || 0,
      heightCm: Number(heightCm) || 0,
      weightKg: currentWeightKg,
      targetWeightKg: Number(targetWeightKg) || 0,
      bodyFatPct: bodyFatPct === "" ? null : Number(bodyFatPct),
      aggressiveness,
    };
    if (!p.age || !p.heightCm || !p.targetWeightKg) return null;

    const plan = dailyPlan(p, {
      stepsGoal: Number(stepsGoal) || 10_000,
      workoutPlannedMinutes: 55,
    });
    return { plan, proj: projection(plan.expenditure.total, plan.targets.kcal, p, 7) };
  }, [
    initial.sex,
    age,
    heightCm,
    currentWeightKg,
    targetWeightKg,
    bodyFatPct,
    aggressiveness,
    stepsGoal,
  ]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(age),
          heightCm: Number(heightCm),
          targetWeightKg: Number(targetWeightKg),
          bodyFatPct: bodyFatPct === "" ? null : Number(bodyFatPct),
          aggressiveness,
          stepsGoal: Number(stepsGoal),
          waterGoalMl: Number(waterGoalMl),
          allergies,
          dislikedFoods,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      setToast("Réglages enregistrés");
      setTimeout(() => setToast(null), 2400);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card p-5">
        <h2 className="text-[15px] font-bold">Toi</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Âge" value={age} onChange={setAge} suffix="ans" />
          <Field label="Taille" value={heightCm} onChange={setHeightCm} suffix="cm" />
          <Field
            label="Poids visé"
            value={targetWeightKg}
            onChange={setTargetWeightKg}
            suffix="kg"
            step="0.1"
          />
          <Field
            label="Masse grasse"
            value={bodyFatPct}
            onChange={setBodyFatPct}
            suffix="%"
            step="0.5"
            placeholder="—"
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {/* Explains why an optional field is worth filling in. */}
          La masse grasse est facultative. Si tu la renseignes, le métabolisme de base est calculé
          par Katch-McArdle, plus précis que la formule standard.
        </p>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-[15px] font-bold">Intensité</h2>
        <div className="mt-3">
          <Segmented options={LEVELS} value={aggressiveness} onChange={setAggressiveness} />
        </div>

        {preview && (
          <div className="mt-4 rounded-2xl bg-sunken p-4">
            <div className="flex items-baseline gap-2">
              <span className="tnum text-[26px] font-bold text-accent">
                {preview.plan.targets.kcal}
              </span>
              <span className="text-[12px] text-muted">kcal / jour</span>
            </div>
            <p className="tnum mt-1 text-[12px] text-muted">
              {preview.plan.targets.proteinG} g de protéines · {preview.plan.targets.fatG} g de
              lipides · {preview.plan.targets.carbsG} g de glucides
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
              Environ <strong>{preview.proj.weeklyFatLossKg.toFixed(2)} kg de graisse</strong> par
              semaine à ce rythme.
            </p>
            {preview.plan.targets.floored && (
              <p className="mt-2 text-[11.5px] leading-relaxed text-accent">
                Calories remontées au plancher protéines + lipides : en dessous, garder du muscle
                devient mécaniquement impossible.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-[15px] font-bold">Objectifs quotidiens</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Pas" value={stepsGoal} onChange={setStepsGoal} suffix="pas" />
          <Field label="Eau" value={waterGoalMl} onChange={setWaterGoalMl} suffix="ml" />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Pendant un défi, l&apos;objectif de pas suit la montée en charge programmée et remplace
          cette valeur.
        </p>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-[15px] font-bold">Cuisine</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Utilisé par le générateur de recettes.
        </p>
        <div className="mt-3 space-y-3">
          <TextField
            label="Allergies"
            value={allergies}
            onChange={setAllergies}
            placeholder="Fruits à coque, lactose…"
          />
          <TextField
            label="Ce que tu n'aimes pas"
            value={dislikedFoods}
            onChange={setDislikedFoods}
            placeholder="Brocoli, poisson…"
          />
        </div>
      </section>

      {error && <p className="mt-4 text-center text-[12.5px] text-danger">{error}</p>}

      <div className="mt-5">
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Toast message={toast} />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step,
  placeholder = "0",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <div className="flex items-center rounded-2xl bg-sunken px-3.5 focus-within:ring-2 focus-within:ring-ink/10">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tnum w-full bg-transparent py-3 text-[17px] font-semibold outline-none placeholder:text-faint"
        />
        <span className="ml-1 shrink-0 text-[11px] text-faint">{suffix}</span>
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-sunken px-4 py-3 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
      />
    </label>
  );
}
