import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealPlans, shoppingItems } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { WeekPlan, type PlanData, type ShoppingItem } from "@/components/WeekPlan";
import { PageHeader } from "@/components/ui";
import { formatDayFR, todayISO, weekStart } from "@/lib/day";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const week = weekStart(todayISO());

  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.weekStart, week))
    .orderBy(desc(mealPlans.createdAt))
    .limit(1);

  const shopping = plan
    ? await db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.mealPlanId, plan.id))
        .orderBy(asc(shoppingItems.aisle), asc(shoppingItems.name))
    : [];

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader
          title="La semaine"
          subtitle={`Semaine du ${formatDayFR(week)}`}
          back="/manger"
        />
        <div className="mt-6">
          <WeekPlan
            initialPlan={(plan?.plan as PlanData) ?? null}
            initialShopping={shopping as ShoppingItem[]}
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
