"use client";

import { useCallback, useEffect, useState } from "react";
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

  const suggested =
    current?.last?.sets.find((s) => s.setNumber === doneSets.length + 1) ??
    current?.last?.sets[current.last.sets.length - 1] ??
    null;

  // Rest countdown.
  useEffect(() => {
    if (rest === null) return;

    if (rest <= 0) {
      navigator.vibrate?.([120, 60, 120]);
      // Cleared on a delay rather than synchronously: it lets "Go" sit on screen
      // for a beat, and setting state in the effect body would cascade a render.
      const clear = setTimeout(() => setRest(null), 2000);
      return () => clearTimeout(clear);
    }

    const tick = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(tick);
  }, [rest]);

  const say = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  async function logSet(weightKg: number | null, repsValue: number) {
    if (!current) return;

    const setNumber = doneSets.length + 1;
    const res = await fetch(`/api/workouts/${workoutId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: current.slug, setNumber, reps: repsValue, weightKg }),
    });

    if (!res.ok) {
      say("Enregistrement impossible");
      return;
    }

    const data = await res.json();
    setSets((prev) => [
      ...prev,
      { id: data.set.id, exerciseSlug: current.slug, setNumber, reps: repsValue, weightKg },
    ]);

    // Beat-last-time feedback, only when there is something to beat.
    const previous = current.last?.sets.find((s) => s.setNumber === setNumber);
    if (previous) {
      const before = (previous.weightKg ?? 0) * previous.reps;
      const now = (weightKg ?? 0) * repsValue;
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
              className={`tnum shrink-0 rounded-full px-4 py-2 text-[14px] font-bold text-white ${
                rest <= 0 ? "bg-ink" : "bg-accent"
              }`}
            >
              {rest <= 0 ? "GO" : `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`}
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

        {/* Keyed so a new set starts from last time's numbers without an effect
            copying props into state — the key remounts it with fresh defaults. */}
        <SetEntry
          key={`${current.slug}-${doneSets.length}`}
          defaultWeight={suggested?.weightKg != null ? String(suggested.weightKg) : ""}
          defaultReps={suggested?.reps != null ? String(suggested.reps) : ""}
          onLog={logSet}
          onInvalid={() => say("Indique le nombre de répétitions")}
        />

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

      {/* Mounted only while open, so the elapsed time is read once on open
          rather than recomputed on every render. */}
      {finishOpen && (
        <FinishSheet
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
      )}

      <Toast message={toast} />
    </>
  );
}

/** One set's inputs. Owns its own draft state; remounted per set via its key. */
function SetEntry({
  defaultWeight,
  defaultReps,
  onLog,
  onInvalid,
}: {
  defaultWeight: string;
  defaultReps: string;
  onLog: (weightKg: number | null, reps: number) => void;
  onInvalid: () => void;
}) {
  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);

  function submit() {
    const repsValue = Number(reps);
    if (!Number.isFinite(repsValue) || repsValue <= 0) {
      onInvalid();
      return;
    }
    onLog(weight === "" ? null : Number(weight), repsValue);
  }

  return (
    <div className="mt-5 flex items-end gap-2.5">
      <Input label="Charge" value={weight} onChange={setWeight} suffix="kg" />
      <Input label="Reps" value={reps} onChange={setReps} suffix="×" />
      <button
        onClick={submit}
        className="h-[52px] shrink-0 rounded-2xl bg-accent px-6 font-bold text-white shadow-[0_8px_22px_-8px_rgb(233_99_60/0.6)] transition active:scale-95"
      >
        OK
      </button>
    </div>
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
  onClose,
  workoutId,
  startedAt,
  setsLogged,
  onFinished,
}: {
  onClose: () => void;
  workoutId: number;
  startedAt: string;
  setsLogged: number;
  onFinished: () => void;
}) {
  // Read once, when the sheet mounts: the duration should not tick upward while
  // he is choosing how the session felt.
  const [elapsed] = useState(() =>
    Math.max(5, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)),
  );
  const [rating, setRating] = useState(3);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await fetch(`/api/workouts/${workoutId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: elapsed, rating }),
      });
      onFinished();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Terminer la séance">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-sunken px-4 py-3 text-center">
          <p className="tnum text-[22px] font-bold">{elapsed}</p>
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
