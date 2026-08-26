"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Shared POST + refresh: every card writes, then re-renders the server page. */
function useSaver() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function save(url: string, body: unknown) {
    setBusy(true);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return { save, busy: busy || pending };
}

function EditToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-sunken px-3 py-1.5 text-[11px] font-semibold text-ink-soft transition active:scale-95"
    >
      {open ? "Fermer" : "Modifier"}
    </button>
  );
}

export function StepsCard({
  steps,
  goal,
  earnedKcal,
  synced,
}: {
  steps: number;
  goal: number;
  earnedKcal: number;
  synced: boolean;
}) {
  const { save, busy } = useSaver();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(steps));

  const pct = goal > 0 ? Math.min(1, steps / goal) : 0;
  const remaining = Math.max(0, goal - steps);

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-medium text-muted">Pas aujourd&apos;hui</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum display text-[2rem]">{steps.toLocaleString("fr-FR")}</span>
            <span className="tnum text-sm text-faint">/ {goal.toLocaleString("fr-FR")}</span>
          </div>
        </div>
        <EditToggle open={editing} onClick={() => setEditing((v) => !v)} />
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <p className="mt-3 text-[13px] text-ink-soft">
        {remaining > 0 ? (
          <>
            Encore{" "}
            <span className="tnum font-semibold">{remaining.toLocaleString("fr-FR")}</span> pas pour
            boucler la journée.
          </>
        ) : (
          <>
            Objectif atteint.{" "}
            {earnedKcal > 0 && (
              <span className="font-semibold text-accent">+{earnedKcal} kcal gagnées.</span>
            )}
          </>
        )}
      </p>

      {editing && (
        <div className="animate-pop mt-4 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="tnum min-w-0 flex-1 rounded-2xl bg-sunken px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-ink/10"
          />
          <button
            onClick={async () => {
              await save("/api/steps", { steps: Number(value) });
              setEditing(false);
            }}
            disabled={busy}
            className="shrink-0 rounded-2xl bg-ink px-5 font-semibold text-white transition active:scale-95 disabled:opacity-40"
          >
            OK
          </button>
        </div>
      )}

      {!synced && (
        <p className="mt-3 text-[11px] text-faint">
          Pas encore synchronisé depuis Santé aujourd&apos;hui.
        </p>
      )}
    </section>
  );
}

export function WeightCard({
  latestWeight,
  trendWeight,
  startWeight,
  targetWeight,
  loggedToday,
}: {
  latestWeight: number;
  trendWeight: number;
  startWeight: number;
  targetWeight: number;
  loggedToday: boolean;
}) {
  const { save, busy } = useSaver();
  const [editing, setEditing] = useState(!loggedToday);
  const [value, setValue] = useState(latestWeight.toFixed(1));

  const lostTrend = startWeight - trendWeight;
  const toGo = trendWeight - targetWeight;
  const totalToLose = startWeight - targetWeight;
  const pct = totalToLose > 0 ? Math.min(1, lostTrend / totalToLose) : 0;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-medium text-muted">Poids — tendance</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum display text-[2rem]">{trendWeight.toFixed(1)}</span>
            <span className="text-sm text-faint">kg</span>
            {lostTrend > 0.05 && (
              <span className="tnum text-sm font-semibold text-accent">
                −{lostTrend.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {loggedToday && <EditToggle open={editing} onClick={() => setEditing((v) => !v)} />}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="mt-2.5 flex justify-between text-[11px] text-faint">
        <span className="tnum">{startWeight.toFixed(1)} kg</span>
        <span className="tnum text-ink-soft">encore {toGo.toFixed(1)} kg</span>
        <span className="tnum">{targetWeight.toFixed(1)} kg</span>
      </div>

      {editing && (
        <div className="animate-pop mt-4">
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="tnum min-w-0 flex-1 rounded-2xl bg-sunken px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-ink/10"
            />
            <button
              onClick={async () => {
                await save("/api/weight", { weightKg: Number(value) });
                setEditing(false);
              }}
              disabled={busy}
              className="shrink-0 rounded-2xl bg-accent px-5 font-semibold text-white transition active:scale-95 disabled:opacity-40"
            >
              OK
            </button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-faint">
            {/* Said once, here, so the number above never has to be defended again. */}
            La tendance lisse les variations d&apos;eau. C&apos;est elle qui compte, pas la pesée du
            matin.
          </p>
        </div>
      )}
    </section>
  );
}

export function WaterCard({ waterMl, goalMl }: { waterMl: number; goalMl: number }) {
  const { save, busy } = useSaver();
  const glasses = Math.ceil(goalMl / 250);
  const filled = Math.floor(waterMl / 250);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[12px] font-medium text-muted">Eau</h2>
        <span className="tnum text-xs font-semibold text-ink-soft">
          {(waterMl / 1000).toFixed(2)} / {(goalMl / 1000).toFixed(1)} L
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {Array.from({ length: glasses }, (_, i) => (
          <button
            key={i}
            disabled={busy}
            // Tapping a glass sets the total to that mark, so correcting down is
            // as easy as adding: tap the last full one to undo.
            onClick={() => save("/api/water", { waterMl: (i + 1) * 250 })}
            aria-label={`${(i + 1) * 250} ml`}
            className={`h-9 flex-1 rounded-lg transition ${
              i < filled ? "bg-carbs" : "bg-sunken"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export function WorkoutCard({ planned, done }: { planned: boolean; done: boolean }) {
  const router = useRouter();

  if (!planned) {
    return (
      <section className="card-flat p-5">
        <h2 className="text-[12px] font-medium text-muted">Séance</h2>
        <p className="mt-1.5 text-[15px] font-semibold">Repos aujourd&apos;hui</p>
        <p className="mt-1 text-[12px] text-faint">
          La récupération fait partie du programme. Garde les pas.
        </p>
      </section>
    );
  }

  return (
    <button
      onClick={() => router.push("/bouger")}
      className="w-full rounded-[--radius-card] bg-accent p-5 text-left text-white shadow-[0_8px_24px_-8px_rgb(233_99_60/0.5)] transition active:scale-[0.98]"
    >
      <h2 className="text-[12px] font-medium text-white/70">Séance du jour</h2>
      <p className="mt-1.5 text-[19px] font-bold tracking-tight">
        {done ? "Séance terminée ✓" : "Full-body — lourd et court"}
      </p>
      <p className="mt-1 text-[12px] text-white/80">
        {done ? "Bien joué. Repos et protéines." : "55 min · appuie pour démarrer"}
      </p>
    </button>
  );
}
