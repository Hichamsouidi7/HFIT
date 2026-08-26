"use client";

import { useMemo, useState } from "react";
import { Chips, Sheet } from "@/components/ui";
import {
  EQUIPMENT_LABELS,
  EXERCISES,
  MUSCLE_LABELS,
  type ExerciseDef,
  type MuscleGroup,
} from "@/content/exercises";
import { normalizeForSearch } from "@/lib/search";

type Filter = MuscleGroup | "tous";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tous", label: "Tous" },
  ...(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((g) => ({
    id: g as Filter,
    label: MUSCLE_LABELS[g],
  })),
];

export interface ExerciseStat {
  slug: string;
  day: string;
  bestWeight: number | null;
  bestReps: number;
}

/**
 * Browse the catalogue.
 *
 * Each exercise carries its cue and, when it has been trained, the best set on
 * record — which turns the list from a reference into something worth opening
 * before a session.
 */
export function ExerciseBrowser({ stats }: { stats: Record<string, ExerciseStat> }) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ExerciseDef | null>(null);

  const results = useMemo(() => {
    const q = normalizeForSearch(query);
    return EXERCISES.filter((e) => {
      if (filter !== "tous" && e.muscleGroup !== filter) return false;
      if (q.length >= 2 && !normalizeForSearch(e.name).includes(q)) return false;
      return true;
    });
  }, [filter, query]);

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un exercice…"
        className="card w-full px-4 py-3.5 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink/10"
      />

      <div className="mt-4">
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <p className="mt-4 text-[11.5px] text-faint">
        {results.length} exercice{results.length > 1 ? "s" : ""}
      </p>

      <ul className="mt-2 space-y-2">
        {results.map((exercise) => {
          const stat = stats[exercise.slug];
          return (
            <li key={exercise.slug}>
              <button
                onClick={() => setOpen(exercise)}
                className="card-solid flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">{exercise.name}</p>
                  <p className="truncate text-[11.5px] text-muted">
                    {MUSCLE_LABELS[exercise.muscleGroup]} · {EQUIPMENT_LABELS[exercise.equipment]}
                    {exercise.isCompound && " · polyarticulaire"}
                  </p>
                </div>
                {stat && (
                  <span className="tnum shrink-0 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent">
                    {stat.bestWeight != null ? `${stat.bestWeight} kg` : `${stat.bestReps} reps`}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name ?? ""}>
        {open && (
          <>
            <div className="flex flex-wrap gap-2">
              <Tag>{MUSCLE_LABELS[open.muscleGroup]}</Tag>
              <Tag>{EQUIPMENT_LABELS[open.equipment]}</Tag>
              {open.isCompound && <Tag accent>Polyarticulaire</Tag>}
            </div>

            <p className="mt-4 rounded-2xl bg-sunken p-4 text-[13.5px] leading-relaxed">
              {open.cues}
            </p>

            {stats[open.slug] ? (
              <div className="mt-4 rounded-2xl bg-accent-soft p-4">
                <p className="text-[11px] font-medium text-accent/80">Ton record</p>
                <p className="tnum mt-1 text-[19px] font-bold text-accent">
                  {stats[open.slug].bestWeight != null
                    ? `${stats[open.slug].bestWeight} kg × ${stats[open.slug].bestReps}`
                    : `${stats[open.slug].bestReps} répétitions`}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
                Jamais enregistré. Il apparaîtra ici dès que tu l&apos;auras fait pendant une
                séance.
              </p>
            )}

            <div className="h-2" />
          </>
        )}
      </Sheet>
    </>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
        accent ? "bg-accent text-white" : "bg-sunken text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
}
