import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Settings } from "@/components/Settings";
import { PageHeader } from "@/components/ui";
import { getCurrentWeight, getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profileRow = await getProfile();
  if (!profileRow) redirect("/bienvenue");

  const currentWeightKg = await getCurrentWeight(profileRow);

  return (
    <>
      <main className="mx-auto max-w-md px-5">
        <PageHeader title="Réglages" back="/progres" />

        <div className="mt-6">
          <Settings profile={profileRow} currentWeightKg={currentWeightKg} />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Appareil</h2>
        <div className="mt-4 space-y-2.5">
          <Row
            href="/reglages/sante"
            title="Synchroniser Apple Santé"
            sub="Remonter les pas automatiquement"
          />
        </div>

        <h2 className="display mt-9 text-[1.35rem]">Tes données</h2>
        <div className="mt-4">
          <a
            href="/api/export"
            download
            className="card-solid flex items-center justify-between gap-3 p-4 transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">Exporter en JSON</p>
              <p className="text-[11.5px] text-muted">
                Pesées, repas, séances, séries, recettes — tout sauf les photos.
              </p>
            </div>
            <span className="shrink-0 text-muted">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v11" />
                <path d="m7.5 11 4.5 4.5 4.5-4.5" />
                <path d="M5 19h14" />
              </svg>
            </span>
          </a>
        </div>

        <p className="mt-6 px-1 text-center text-[11px] leading-relaxed text-faint">
          HFit · application personnelle. Tes données sont dans ta base Neon, personne d&apos;autre
          n&apos;y a accès.
        </p>
      </main>
      <BottomNav />
    </>
  );
}

function Row({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="card-solid flex items-center justify-between gap-3 p-4 transition active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="truncate text-[11.5px] text-muted">{sub}</p>
      </div>
      <span className="shrink-0 text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
