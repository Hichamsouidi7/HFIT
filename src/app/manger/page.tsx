import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { DayJournal } from "@/components/DayJournal";
import { FoodCapture } from "@/components/FoodCapture";
import { MacroBar } from "@/components/MacroBar";
import { currentMeal, todayISO } from "@/lib/day";
import { getDayEntries, getDayView, getProfile, usualForMeal } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EatPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const view = await getDayView(day);
  if (!view) redirect("/bienvenue");

  const entries = await getDayEntries(day);
  const { log, totals, budget } = view;
  const remaining = budget.budgetKcal - totals.kcal;
  const proteinLeft = Math.max(0, log.proteinGoalG - totals.proteinG);

  // "What he usually has at this time of day" — habits on a cut are extremely
  // stable, so this removes the search step for most entries.
  const usual = (await usualForMeal(currentMeal())).map((u) => ({
    name: u.name,
    quantityG: Number(u.quantityG),
    kcal: Number(u.kcal),
    proteinG: Number(u.proteinG),
    fatG: Number(u.fatG),
    carbsG: Number(u.carbsG),
    times: Number(u.times),
  }));

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.3rem]">Manger</h1>

        <section className="card mt-5 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="label">{remaining >= 0 ? "Il te reste" : "Tu es au-dessus de"}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`tnum display text-[2.4rem] ${remaining < 0 ? "text-danger" : ""}`}
                >
                  {Math.abs(Math.round(remaining))}
                </span>
                <span className="text-sm font-medium text-muted">kcal</span>
              </div>
            </div>
            <span className="tnum text-[12px] text-faint">
              {totals.kcal} / {budget.budgetKcal}
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            <MacroBar
              label="Protéines"
              value={totals.proteinG}
              goal={log.proteinGoalG}
              color="protein"
              hero
            />
            <MacroBar label="Lipides" value={totals.fatG} goal={log.fatGoalG} color="fat" />
            <MacroBar label="Glucides" value={totals.carbsG} goal={log.carbsGoalG} color="carbs" />
          </div>

          {proteinLeft > 0 && (
            <Link
              href="/manger/idees"
              className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-sunken px-4 py-3 transition active:scale-[0.99]"
            >
              <span className="text-[12.5px] leading-snug text-ink-soft">
                Il te manque <strong>{proteinLeft} g de protéines</strong> et il te reste{" "}
                <strong>{Math.max(0, Math.round(remaining))} kcal</strong>.
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-accent">Des idées →</span>
            </Link>
          )}
        </section>

        <div className="mt-6">
          <FoodCapture usual={usual} />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Préparer</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Tile
            href="/manger/idees"
            title="Idées repas"
            sub="Avec ce que tu as dans le frigo"
          />
          <Tile
            href="/manger/semaine"
            title="La semaine"
            sub="Plan, batch cooking, courses"
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Journal du jour</h2>
        <div className="mt-4">
          <DayJournal entries={entries} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function Tile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card p-4 transition active:scale-[0.98]">
      <p className="text-[14.5px] font-bold">{title}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-muted">{sub}</p>
    </Link>
  );
}
