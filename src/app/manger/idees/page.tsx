import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { pantry, recipes } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { Kitchen, type Recipe } from "@/components/Kitchen";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/day";
import { getDayTotals, getDayView, getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const day = todayISO();
  const view = await getDayView(day);
  if (!view) redirect("/bienvenue");

  const totals = await getDayTotals(day);
  const kcalLeft = Math.max(0, view.budget.budgetKcal - totals.kcal);
  const proteinLeft = Math.max(0, view.log.proteinGoalG - totals.proteinG);

  const [pantryItems, recipeRows] = await Promise.all([
    db.select().from(pantry).orderBy(asc(pantry.name)),
    db
      .select()
      .from(recipes)
      .orderBy(desc(recipes.isFavorite), desc(recipes.createdAt))
      .limit(40),
  ]);

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader
          title="Idées repas"
          subtitle="Des recettes qui rentrent dans ta journée, avec ce que tu as."
          back="/manger"
        />

        <div className="mt-6">
          <Kitchen
            initialPantry={pantryItems}
            initialRecipes={recipeRows as unknown as Recipe[]}
            kcalLeft={kcalLeft}
            proteinLeft={proteinLeft}
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
