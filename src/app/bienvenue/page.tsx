"use client";

import { useMemo, useState } from "react";
import { CHALLENGE_RULES_FR, stepsGoalForDayNumber } from "@/content/challenge-21";
import { dailyPlan, projection, type Aggressiveness, type Profile } from "@/lib/nutrition";

const LEVELS: { id: Aggressiveness; label: string; note: string }[] = [
  { id: "moderate", label: "Modéré", note: "−25 % · confortable, tenable des mois" },
  { id: "aggressive", label: "Agressif", note: "−35 % · ça pique, ça avance vite" },
  { id: "extreme", label: "Extrême", note: "−40 % · le défi 21 jours" },
];

export default function OnboardingPage() {
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("22");
  const [heightCm, setHeightCm] = useState("175");
  const [weightKg, setWeightKg] = useState("85");
  const [targetWeightKg, setTargetWeightKg] = useState("70");
  const [aggressiveness, setAggressiveness] = useState<Aggressiveness>("extreme");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numbers = useMemo(() => {
    const p: Profile = {
      sex,
      age: Number(age) || 0,
      heightCm: Number(heightCm) || 0,
      weightKg: Number(weightKg) || 0,
      targetWeightKg: Number(targetWeightKg) || 0,
      aggressiveness,
    };
    if (!p.age || !p.heightCm || !p.weightKg || !p.targetWeightKg) return null;

    // Preview against week 1 of the challenge, which is what he actually starts on.
    const stepsGoal = stepsGoalForDayNumber(1);
    const plan = dailyPlan(p, { stepsGoal, workoutPlannedMinutes: 55 });
    const proj = projection(plan.expenditure.total, plan.targets.kcal, p, 21);
    return { stepsGoal, plan, proj };
  }, [sex, age, heightCm, weightKg, targetWeightKg, aggressiveness]);

  async function start() {
    if (!numbers) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex,
          age: Number(age),
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          targetWeightKg: Number(targetWeightKg),
          aggressiveness,
          startChallenge: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Enregistrement impossible.");
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Enregistrement impossible. Vérifie ta connexion.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-12">
      <h1 className="display text-[2.6rem]">
        Bienvenue sur H<span className="text-accent">Fit</span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Quelques chiffres et ton programme est calculé. Tout reste modifiable ensuite.
      </p>

      <section className="card mt-7 space-y-5 p-5">
        <Segmented
          label="Sexe"
          value={sex}
          onChange={(v) => setSex(v as "male" | "female")}
          options={[
            { id: "male", label: "Homme" },
            { id: "female", label: "Femme" },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Âge" value={age} onChange={setAge} suffix="ans" />
          <Field label="Taille" value={heightCm} onChange={setHeightCm} suffix="cm" />
          <Field
            label="Poids actuel"
            value={weightKg}
            onChange={setWeightKg}
            suffix="kg"
            step="0.1"
          />
          <Field
            label="Poids visé"
            value={targetWeightKg}
            onChange={setTargetWeightKg}
            suffix="kg"
            step="0.1"
          />
        </div>
      </section>

      <h2 className="display mt-8 text-[1.4rem]">Intensité</h2>
      <div className="mt-3 space-y-2.5">
        {LEVELS.map((lvl) => {
          const selected = aggressiveness === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setAggressiveness(lvl.id)}
              className={`w-full rounded-3xl p-4 text-left transition active:scale-[0.99] ${
                selected ? "bg-ink text-white" : "card"
              }`}
            >
              <span className="block font-semibold">{lvl.label}</span>
              <span className={`mt-0.5 block text-[12px] ${selected ? "text-white/60" : "text-muted"}`}>
                {lvl.note}
              </span>
            </button>
          );
        })}
      </div>

      {numbers && (
        <>
          <h2 className="display mt-9 text-[1.4rem]">Ton programme</h2>

          <section className="animate-pop card mt-4 p-5">
            <div className="flex items-baseline gap-2">
              <span className="tnum display text-[3rem] text-accent">
                {numbers.plan.targets.kcal}
              </span>
              <span className="text-sm font-medium text-muted">kcal / jour</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Stat label="Protéines" value={`${numbers.plan.targets.proteinG} g`} accent />
              <Stat label="Lipides" value={`${numbers.plan.targets.fatG} g`} />
              <Stat label="Glucides" value={`${numbers.plan.targets.carbsG} g`} />
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <Row label="Métabolisme de base" value={`${numbers.plan.expenditure.bmr} kcal`} />
              <Row
                label={`Dépense à ${numbers.stepsGoal.toLocaleString("fr-FR")} pas + séance`}
                value={`${numbers.plan.expenditure.total} kcal`}
              />
              <Row label="Déficit quotidien" value={`${numbers.proj.dailyDeficit} kcal`} />
            </dl>

            <p className="mt-4 rounded-2xl bg-sunken p-3.5 text-[12px] leading-relaxed text-ink-soft">
              Sur 21 jours : environ{" "}
              <strong>{numbers.proj.fatLossKg.toFixed(1)} kg de graisse</strong>. La balance
              descendra plus vite la première semaine (eau et glycogène), compte plutôt{" "}
              <strong>
                {(numbers.proj.fatLossKg + 1.5).toFixed(1)} à{" "}
                {(numbers.proj.fatLossKg + 2).toFixed(1)} kg
              </strong>{" "}
              affichés. C&apos;est pour ça que l&apos;app te montrera la tendance, pas le poids brut.
            </p>

            {numbers.plan.targets.floored && (
              <p className="mt-3 rounded-2xl bg-accent-soft p-3.5 text-[12px] leading-relaxed text-accent">
                Le déficit demandé passait sous le minimum protéines + lipides. Les calories ont été
                remontées à ce plancher : en dessous, « sec et musclé » n&apos;est plus atteignable.
              </p>
            )}
          </section>
        </>
      )}

      <h2 className="display mt-9 text-[1.4rem]">Les règles du défi</h2>
      <ul className="card mt-4 space-y-3 p-5">
        {CHALLENGE_RULES_FR.map((rule) => (
          <li key={rule} className="flex gap-3 text-[13px] leading-snug text-ink-soft">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {rule}
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}

      <button
        onClick={start}
        disabled={!numbers || busy}
        className="mt-6 w-full rounded-2xl bg-accent py-4 font-semibold text-white shadow-[0_8px_24px_-8px_rgb(233_99_60/0.6)] transition active:scale-[0.98] disabled:opacity-30 disabled:shadow-none"
      >
        {busy ? "Un instant…" : "Démarrer le défi"}
      </button>
      <p className="mt-3 text-center text-[12px] text-faint">Le jour 1 commence aujourd&apos;hui.</p>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  step?: string;
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
          onChange={(e) => onChange(e.target.value)}
          className="tnum w-full bg-transparent py-3 text-lg font-semibold outline-none"
        />
        <span className="ml-1 shrink-0 text-xs text-faint">{suffix}</span>
      </div>
    </label>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <div className="flex gap-1.5 rounded-2xl bg-sunken p-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              value === o.id ? "bg-card text-ink shadow-sm" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-sunken py-3 text-center">
      <div className={`tnum text-[17px] font-bold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-faint">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum shrink-0 font-semibold">{value}</dd>
    </div>
  );
}
