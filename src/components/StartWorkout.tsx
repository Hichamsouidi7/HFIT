"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Creates (or resumes) the day's session, then opens the runner.
 *
 * Deliberately a button rather than a side effect of loading /bouger/seance:
 * merely looking at the programme should not open an empty workout that then
 * pollutes the history.
 */
export function StartWorkout({
  sessionTitle,
  resume,
}: {
  sessionTitle: string;
  resume: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sessionTitle }),
      });
      if (res.ok) router.push("/bouger/seance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className="card-accent w-full p-5 text-left transition active:scale-[0.99] disabled:opacity-70"
    >
      <p className="text-[12px] font-medium text-white/75">Séance du jour</p>
      <p className="mt-1.5 text-[21px] font-bold tracking-tight">{sessionTitle}</p>
      <p className="mt-1 text-[12.5px] text-white/85">
        {busy ? "Ouverture…" : resume ? "Reprendre là où tu t'es arrêté →" : "Appuie pour démarrer →"}
      </p>
    </button>
  );
}
