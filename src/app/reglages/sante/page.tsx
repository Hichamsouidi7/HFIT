import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Ouvre l'app Raccourcis sur ton iPhone",
    body: "Elle est installée d'origine. Onglet « Raccourcis », puis le + en haut à droite.",
  },
  {
    title: "Ajoute l'action « Trouver des échantillons de santé »",
    body: "Règle : Type = Pas · Trier par Date de début · Limite = tous les échantillons d'aujourd'hui. Puis ajoute « Calculer les statistiques » → Somme.",
  },
  {
    title: "Ajoute « Obtenir le contenu d'une URL »",
    body: "Colle l'URL ci-dessous. Méthode : POST. Corps de la requête : JSON, avec un champ « steps » qui contient le résultat de l'étape précédente.",
  },
  {
    title: "Nomme-le « Sync HFit » et ajoute-le à l'écran d'accueil",
    body: "Un tap suffira. Place-le juste à côté de l'icône HFit.",
  },
  {
    title: "Automatise-le",
    body: "Onglet « Automatisation » → + → Heure de la journée → 22h00 → Quotidien. Choisis « Exécuter immédiatement » et désactive « Prévenir à l'exécution ».",
  },
];

export default function HealthSyncPage() {
  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-10">
        <Link href="/" className="text-[13px] font-medium text-muted">
          ← Retour
        </Link>

        <h1 className="display mt-4 text-[2.2rem]">Synchroniser Santé</h1>

        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Apple interdit aux applications web de lire Santé — c&apos;est réservé aux apps natives,
          ce qui imposerait un compte développeur à 99 € par an. On passe donc par l&apos;app
          Raccourcis : gratuit, et une fois réglé, ça tourne tout seul.
        </p>

        <section className="card mt-6 p-5">
          <h2 className="text-[12px] font-medium text-muted">Ton URL de synchronisation</h2>
          <p className="mt-2 break-all rounded-2xl bg-sunken p-3 font-mono text-[11px] leading-relaxed">
            https://<span className="text-accent">ton-app</span>.vercel.app/api/health/sync?token=
            <span className="text-accent">TON_JETON</span>
          </p>
          <p className="mt-2.5 text-[11px] leading-relaxed text-faint">
            Remplace par l&apos;adresse réelle de ton app et par la valeur de la variable
            HEALTH_SYNC_TOKEN définie sur Vercel.
          </p>
        </section>

        <ol className="mt-4 space-y-2.5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-snug">{step.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-5 rounded-2xl bg-sunken p-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            <strong className="font-semibold">À savoir :</strong> les automatisations horaires
            d&apos;iOS sont parfois capricieuses — elles peuvent sauter un tour si le téléphone est
            resté verrouillé longtemps. C&apos;est pour ça que le raccourci est aussi sur
            l&apos;écran d&apos;accueil, et que la saisie manuelle des pas reste toujours possible.
          </p>
        </section>

        <section className="mt-4 rounded-2xl bg-accent-soft p-4">
          <p className="text-[12px] leading-relaxed text-accent">
            <strong className="font-semibold">Bonus :</strong> ajoute aussi « Masse corporelle » et
            « Analyse du sommeil » dans le même raccourci, avec les champs{" "}
            <span className="font-mono">weightKg</span> et{" "}
            <span className="font-mono">sleepHours</span>. Si ta balance est reliée à Santé, la
            pesée du matin remontera toute seule.
          </p>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
