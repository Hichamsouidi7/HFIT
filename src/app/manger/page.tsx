import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { FoodSearch } from "@/components/FoodSearch";
import { DayJournal } from "@/components/DayJournal";
import { MacroBar } from "@/components/MacroBar";
import { todayISO } from "@/lib/day";
import { getDayEntries, getDayView, getProfile } from "@/lib/queries";

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

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="display text-[2.4rem]">Manger</h1>

        <section className="card mt-5 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-muted">
                {remaining >= 0 ? "Il te reste" : "Tu es au-dessus de"}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`tnum display text-[2.4rem] ${remaining < 0 ? "text-danger" : "text-ink"}`}
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
        </section>

        <h2 className="display mt-8 text-[1.4rem]">Ajouter</h2>
        <div className="mt-4">
          <FoodSearch />
        </div>

        <h2 className="display mt-9 text-[1.4rem]">Journal du jour</h2>
        <div className="mt-4">
          <DayJournal entries={entries} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
