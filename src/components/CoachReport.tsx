"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface Report {
  id: number;
  weekStart: string;
  content: string;
  actions: { title: string; why: string }[] | null;
  adjustment: {
    verdict: string;
    actualWeeklyLossKg: number;
    targetWeeklyLossKg: number;
    kcalAdjustment: number;
    stepsAdjustment: number;
  } | null;
}

/**
 * The weekly review, generated on demand.
 *
 * Not generated automatically on page load: it costs a model call, and a report
 * nobody asked for is a report nobody reads.
 */
export function CoachReport({ initial }: { initial: Report | null }) {
  const [report, setReport] = useState<Report | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bilan impossible.");
        return;
      }
      setReport(data.report);
    } catch {
      setError("Bilan impossible. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  }

  if (!report) {
    return (
      <section className="card p-5">
        <h3 className="text-[15px] font-bold">Bilan de la semaine</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          Une analyse de ta semaine — poids, adhérence, séances — et trois priorités concrètes pour
          la suivante.
        </p>
        <div className="mt-4">
          <Button onClick={generate} disabled={busy}>
            {busy ? "Analyse en cours…" : "Générer le bilan"}
          </Button>
        </div>
        {error && (
          <p className="mt-3 rounded-2xl bg-danger/10 p-3 text-center text-[12px] leading-relaxed text-danger">
            {error}
          </p>
        )}
      </section>
    );
  }

  const [verdict, ...rest] = report.content.split("\n\n");

  return (
    <section className="card p-5">
      <h3 className="text-[15px] font-bold leading-snug">{verdict}</h3>
      {rest.length > 0 && (
        <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
          {rest.join("\n\n")}
        </p>
      )}

      {report.adjustment && report.adjustment.verdict !== "on_track" && (
        <div className="mt-4 rounded-2xl bg-sunken p-4">
          <p className="text-[11px] font-medium text-muted">Mesuré par l&apos;app</p>
          <p className="tnum mt-1 text-[13px] font-semibold">
            {report.adjustment.actualWeeklyLossKg.toFixed(2)} kg / semaine
            <span className="font-normal text-muted">
              {" "}
              (visé {report.adjustment.targetWeeklyLossKg.toFixed(1)})
            </span>
          </p>
        </div>
      )}

      {report.actions && report.actions.length > 0 && (
        <>
          <h4 className="label mt-5">Tes 3 priorités</h4>
          <ol className="mt-2 space-y-2.5">
            {report.actions.map((action, i) => (
              <li key={i} className="flex gap-3">
                <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug">{action.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">{action.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
