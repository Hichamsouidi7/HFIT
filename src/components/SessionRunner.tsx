"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Sheet, Toast } from "@/components/ui";

export interface RunnerExercise {
  slug: string;
  name: string;
  cues: string | null;
  sets: number;
  reps: string;
  restSeconds: number;
  note?: string;
  last: {
    day: string;
    sets: { setNumber: number; reps: number; weightKg: number | null }[];
  } | null;
}

interface LoggedSet {
  id: number;
  exerciseSlug: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
}

/**
 * The session, run one exercise at a time.
 *
 * Two decisions drive this screen. First, last session's numbers sit right above
 * the input — progressive overload only happens if the target is visible while
 * you decide what to load. Second, the rest timer starts by itself the moment a
 * set is saved: on a deficit the temptation is to cut rest short and turn a
 * strength session into cardio, which is the opposite of what protects muscle.
 */
export function SessionRunner({
  workoutId,
  sessionTitle,
  exercises,
  initialSets,
  startedAt,
}: {
  workoutId: number;
  sessionTitle: string;
  exercises: RunnerExercise[];
  initialSets: LoggedSet[];
  startedAt: string;
}) {
  const router = useRouter();

  const [sets, setSets] = useState<LoggedSet[]>(initialSets);
  const [index, setIndex] = useState(() => {
    // Resume where he left off rather than at exercise one.
    const firstUnfinished = exercises.findIndex(
      (ex) => initialSets.filter((s) => s.exerciseSlug === ex.slug).length < ex.sets,
    );
    return firstUnfinished === -1 ? 0 : firstUnfinished;
  });
  const [rest, setRest] = useState<number | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const current = exercises[index];
  const doneSets = sets.filter((s) => s.exerciseSlug === current?.slug);

  const suggested = current?.last?.sets.find((s) => s.setNumber === doneSets.length + 1) ??
    current?.last?.sets[current.last.sets.length - 1] ??
    null;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  useEffect(() => {
    // Prefill with last time's numbers for this set: the fastest correct entry
    // is usually "same as last time, maybe one more rep".
    setWeight(suggested?.weightKg != null ? String(suggested.weightKg) : "");
    setReps(suggested?.reps != null ? String(suggested.reps) : "");
  }, [suggested?.weightKg, suggested?.reps, index, doneSets.length]);

  // Rest countdown.
  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      navigator.vibrate?.([120, 60, 120]);
      setRest(null);
      return;
    }
    const timer = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(timer);
  }, [rest]);

  const say = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  async function logSet() {
    if (!current) return;
    const repsValue = Number(reps);
    if (!Number.isFinite(repsValue) || repsValue <= 0) {
      say("Indique le nombre de répétitions");
      return;
    }

    const setNumber = doneSets.length + 1;
    const res = await fetch(`/api/workouts/${workoutId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: current.slug,
        setNumber,
        reps: repsValue,
        weightKg: weight === "" ? null : Number(weight),
      }),
    });

    if (!res.ok) {
      say("Enregistrement impossible");
      return;
    }

    const data = await res.json();
    setSets((prev) => [
      ...prev,
      {
        id: data.set.id,
        exerciseSlug: current.slug,
        setNumber,
        reps: repsValue,
        weightKg: weight === "" ? null : Number(weight),
      },
    ]);

    // Beat-last-time feedback, only when there is something to beat.
    const previous = current.last?.sets.find((s) => s.setNumber === setNumber);
    if (previous) {
      const before = (previous.weightKg ?? 0) * previous.reps;
      const now = (weight === "" ? 0 : Number(weight)) * repsValue;
      if (now > before) say("Mieux que la dernière fois 💪");
    }

    if (setNumber >= current.sets) {
      setRest(null);
      if (index < exercises.length - 1) {
        setIndex((i) => i + 1);
        say("Exercice suivant");
      }
    } else {
      setRest(current.restSeconds);
    }
  }

  async function removeSet(setId: number) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    await fetch(`/api/workouts/sets/${setId}`, { method: "DELETE" });
  }

  if (!current) return null;

  const totalSets = exercises.reduce((n, e) => n + e.sets, 0);
  const progress = totalSets > 0 ? sets.length / totalSets : 0;

  return (
    <>
      {/* Sticky progress + rest timer: both matter mid-set, when the phone is
          on the bench and only the top of the screen is visible. */}
      <div className="sticky top-0 z-30 -mx-5 mb-4 bg-canvas/85 px-5 pb-3 pt-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{sessionTitle}</p>
            <p className="tnum text-[11px] text-muted">
              {sets.length} / {totalSets} séries · exercice {index + 1}/{exercises.length}
            </p>
          </div>
          {rest !== null ? (
            <button
              onClick={() => setRest(null)}
              className="tnum shrink-0 rounded-full bg-accent px-4 py-2 text-[14px] font-bold text-white"
            >
              {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
            </button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setFinishOpen(true)}>
              Terminer
            </Button>
          )}
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold leading-tight">{current.name}</h2>
            <p className="tnum mt-1 text-[12.5px] text-muted">
              {current.sets} séries × {current.reps} · repos {current.restSeconds}s
            </p>
          </div>
          <span className="tnum shrink-0 rounded-full bg-sunken px-3 py-1.5 text-[12px] font-bold">
            {doneSets.length}/{current.sets}
          </span>
        </div>

        {current.cues && (
          <p className="mt-3 rounded-2xl bg-sunken p-3.5 text-[12.5px] leading-relaxed text-ink-soft">
            {current.cues}
          </p>
        )}

        {current.note && (
          <p className="mt-2.5 rounded-2xl bg-accent-soft p-3.5 text-[12.5px] leading-relaxed text-accent">
            {current.note}
          </p>
        )}

        {current.last ? (
          <div className="mt-4">
            <p className="label">La dernière fois</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {current.last.sets.map((s) => (
                <span
                  key={s.setNumber}
                  className="tnum rounded-lg bg-sunken px-2.5 py-1.5 text-[12px] font-semibold"
                >
                  {s.weightKg != null ? `${s.weightKg} kg` : "—"} × {s.reps}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[12px] text-faint">
            Première fois sur cet exercice. Choisis une charge que tu contrôles : elle servira de
            référence pour la suite.
          </p>
        )}

        <div className="mt-5 flex items-end gap-2.5">
          <Input label="Charge" value={weight} onChange={setWeight} suffix="kg" />
          <Input label="Reps" value={reps} onChange={setReps} suffix="×" />
          <button
            onClick={logSet}
            className="h-[52px] shrink-0 rounded-2xl bg-accent px-6 font-bold text-white shadow-[0_8px_22px_-8px_rgb(233_99_60/0.6)] transition active:scale-95"
          >
            OK
          </button>
        </div>

        {doneSets.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {doneSets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-sunken px-3.5 py-2"
              >
                <span className="tnum text-[12.5px] font-semibold">
                  Série {s.setNumber} · {s.weightKg != null ? `${s.weightKg} kg` : "—"} × {s.reps}
                </span>
                <button
                  onClick={() => removeSet(s.id)}
                  aria-label={`Supprimer la série ${s.setNumber}`}
                  className="text-faint"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 flex gap-2.5">
        <Button
          variant="soft"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex-1"
        >
          Précédent
        </Button>
        <Button
          variant="soft"
          size="sm"
          onClick={() => setIndex((i) => Math.min(exercises.length - 1, i + 1))}
          disabled={index === exercises.length - 1}
          className="flex-1"
        >
          Suivant
        </Button>
      </div>

      <ol className="mt-6 space-y-1.5">
        {exercises.map((ex, i) => {
          const count = sets.filter((s) => s.exerciseSlug === ex.slug).length;
          const complete = count >= ex.sets;
          return (
            <li key={ex.slug}>
              <button
                onClick={() => setIndex(i)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  i === index ? "bg-ink text-white" : "card-solid"
                }`}
              >
                <span
                  className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    complete
                      ? "bg-accent text-white"
                      : i === index
                        ? "bg-white/20 text-white"
                        : "bg-sunken text-ink-soft"
                  }`}
                >
                  {complete ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                  {ex.name}
                </span>
                <span
                  className={`tnum shrink-0 text-[11px] ${i === index ? "text-white/60" : "text-muted"}`}
                >
                  {count}/{ex.sets}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        workoutId={workoutId}
        startedAt={startedAt}
        setsLogged={sets.length}
        onFinished={() => {
          setFinishOpen(false);
          router.push("/bouger");
          router.refresh();
        }}
      />

      <Toast message={toast} />
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <div className="flex h-[52px] items-center rounded-2xl bg-sunken px-3.5 focus-within:ring-2 focus-within:ring-ink/10">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="tnum w-full bg-transparent text-[19px] font-bold outline-none placeholder:text-faint"
        />
        <span className="ml-1 shrink-0 text-[12px] text-faint">{suffix}</span>
      </div>
    </label>
  );
}

function FinishSheet({
  open,
  onClose,
  workoutId,
  startedAt,
  setsLogged,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  workoutId: number;
  startedAt: string;
  setsLogged: number;
  onFinished: () => void;
}) {
  const elapsedRef = useRef(0);
  const [rating, setRating] = useState(3);
  const [busy, setBusy] = useState(false);

  elapsedRef.current = Math.max(
    5,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
  );

  async function finish() {
    setBusy(true);
    try {
      await fetch(`/api/workouts/${workoutId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: elapsedRef.current, rating }),
      });
      onFinished();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Terminer la séance">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-sunken px-4 py-3 text-center">
          <p className="tnum text-[22px] font-bold">{elapsedRef.current}</p>
          <p className="text-[11px] text-muted">minutes</p>
        </div>
        <div className="rounded-2xl bg-sunken px-4 py-3 text-center">
          <p className="tnum text-[22px] font-bold">{setsLogged}</p>
          <p className="text-[11px] text-muted">séries</p>
        </div>
      </div>

      <p className="label mt-5">Comment c&apos;était ?</p>
      <div className="mt-2 flex gap-2">
        {[
          { v: 1, l: "Vidé" },
          { v: 2, l: "Dur" },
          { v: 3, l: "Correct" },
          { v: 4, l: "Bien" },
          { v: 5, l: "Fort" },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setRating(o.v)}
            className={`flex-1 rounded-xl py-2.5 text-[11.5px] font-semibold transition ${
              rating === o.v ? "bg-ink text-white" : "bg-sunken text-muted"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
        Ta séance compte pour 15 points dans le score du jour, et les calories brûlées viennent
        s&apos;ajouter à ton budget.
      </p>

      <div className="mt-4 pb-2">
        <Button onClick={finish} disabled={busy}>
          {busy ? "Enregistrement…" : "Séance terminée"}
        </Button>
      </div>
    </Sheet>
  );
}
