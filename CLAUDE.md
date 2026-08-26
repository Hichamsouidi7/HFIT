# CLAUDE.md — HFit

## Contexte humain (à lire avant tout)

Hicham **ne sait pas coder** et construit cette application en vibe-coding. Règles permanentes :

- Toujours répondre et expliquer **en français**, simplement. Le code et les commentaires restent en anglais.
- Avancer **pas à pas**. Donner les commandes exactes à copier-coller. Vérifier que chaque étape marche avant la suivante.
- Expliquer chaque terme technique nouveau en une phrase, la première fois.
- Proposer un commit Git avec un message clair après chaque fonctionnalité qui marche.
- En cas d'erreur : diagnostiquer calmement, corriger le minimum. Ne jamais refondre l'architecture sans demander.
- Éviter d'empiler les questions : une décision à la fois.

## Objectif du produit

Application web personnelle de perte de poids. **Un seul utilisateur.** Usage principal **sur iPhone**
(Android possible). **Budget 0 €** — uniquement des services gratuits. Tout est hébergé dans le cloud,
aucune machine perso ne reste allumée.

Point de départ : **85 kg pour 1m75, 22 ans**. Objectif : **70 kg, sec et athlétique**.
Premier jalon : un **défi de 21 jours volontairement agressif** (marche, muscu en salle, déficit
important, apport très protéiné).

**Le déficit agressif est une décision assumée, déjà discutée. Ne pas la rediscuter.** Le rôle de
l'app n'est pas de freiner, c'est de rendre l'agressivité tenable : plancher protéines élevé,
poids-tendance plutôt que poids brut, budget calorique dynamique.

## Stack imposée (ne pas changer sans demander)

- **Next.js 16 (App Router) + TypeScript + Tailwind 4**
- **Hébergement : Vercel** (Hobby gratuit), déploiement auto depuis GitHub
- **Base : Postgres via Neon** (créée depuis l'onglet Storage de Vercel) + **Drizzle ORM**
- **IA : API Gemini** (`GEMINI_API_KEY`) — vision (photo d'assiette) et génération (recettes,
  plan de la semaine, bilan hebdo). **Vérifier le nom exact du modèle Flash du moment dans AI
  Studio avant d'implémenter**, ne jamais deviner un nom de modèle.
- **PWA installable** (manifest, icônes, écran d'accueil)

## Règles non négociables

1. **Aucun secret dans le code ni sur GitHub.** `.env.local` en dev, variables Vercel en prod.
2. **`GEMINI_API_KEY` ne quitte jamais le serveur** — tous les appels passent par des routes API.
3. **L'app est publique sur internet → middleware mot de passe obligatoire** (`ACCESS_PASSWORD`).
   Seules exceptions publiques : `/login`, `/api/login`, `/api/health/sync` (qui porte son propre jeton).
4. **Résilience aux quotas gratuits** : retry/backoff sur les 429, bascule de modèle, message
   d'erreur clair en français. Jamais d'écran cassé.
5. **Interface en français.**
6. Design : voir la section Design ci-dessous. Mobile-first, gros boutons tactiles.

## Design

Langage visuel fixé par Hicham (référence : capture d'écran d'une app fitness) :

- **Fond gris clair chaud** (`--color-canvas`), **cartes blanches** très arrondies (`.card`,
  rayon 1.75rem) avec ombres larges et très peu opaques.
- **Un seul accent : corail** `#e9633c`. Utilisé pour la progression et les actions.
- **Gros titres noirs, gras, très serrés** (`.display`).
- **Boutons ronds blancs** en rangée sous la carte héro (`.puck`).
- **Barre de navigation flottante sombre** en bas, onglet actif = pastille blanche avec libellé.
- **Pas de mode sombre** — le contraste carte blanche / fond gris doit toujours être identique.
- Chiffres en `tabular-nums` (classe `.tnum`) pour qu'ils ne dansent pas.

## Principe directeur : une app = un chemin, pas un catalogue

L'accueil n'est pas un menu, c'est **la journée en cours**. **Navigation à 4 onglets maximum :
Jour · Manger · Bouger · Progrès.**

> ⚠️ **Ne jamais ajouter un cinquième onglet.** Toute nouvelle fonctionnalité doit être atteignable
> depuis l'un des quatre, sinon on refabrique le fourre-tout. (Règle héritée du projet
> `app_anglais_dev`, où l'app avait dérivé en catalogue de modules avant d'être refondue.)

## Décisions techniques déjà prises (ne pas refaire le débat)

- **Apple Santé est inaccessible depuis le web.** HealthKit est réservé aux apps natives (compte
  développeur Apple à 99 €/an). Solution retenue : **raccourci iOS** qui POST sur
  `/api/health/sync` avec un jeton (`HEALTH_SYNC_TOKEN`), déclenché par une automatisation horaire.
  Filets de secours : icône du raccourci sur l'écran d'accueil, et saisie manuelle.
- **Le budget calorique se calcule sur l'objectif de pas, pas sur les pas déjà faits.** Sinon il
  afficherait ~1 300 kcal au petit-déjeuner et grandirait dans la journée. Les pas au-delà de
  l'objectif donnent un **bonus** ; un déficit de pas ne retire rien (voir `liveBudget`).
- **Les macros des repas sont copiées dans `food_entries`**, jamais jointes depuis `foods` :
  corriger un aliment ne doit pas réécrire l'historique.
- **Les objectifs du jour sont figés dans `daily_logs`** à la première ouverture du jour, pour
  qu'un jour passé garde les objectifs sur lesquels il a été noté.
- **Recherche d'aliments : classement par pertinence obligatoire.** Un simple « contient » est
  inutilisable sur CIQUAL (« oeuf » remonte « b·oeuf bourguignon », « riz » remonte « riz
  cantonais » avant le riz nature). Voir `searchFoods` et `src/lib/search.ts`.
- **Toutes les dates passent par `src/lib/day.ts`** (fuseau Europe/Paris). Vercel tourne en UTC :
  sans ça, tout ce qui est saisi entre minuit et 2h tomberait la veille.

## Sources de données

- **CIQUAL 2020 (ANSES)** — 2 298 aliments bruts et cuisinés français, dans `data/ciqual.json`.
  Régénérable : `node scripts/build-ciqual.mjs` depuis `data/ciqual.xls`.
- **Open Food Facts** — produits emballés par code-barres, sans clé ni inscription (à brancher).
- **Compléments maison** — une quinzaine de basiques que CIQUAL 2020 n'a pas (skyr, whey,
  flocons d'avoine…), dans `scripts/seed-ciqual.ts`.

## Commandes

```bash
npm run dev            # serveur de développement
npm run build          # build de production (doit passer avant tout commit)
npm run typecheck      # vérification TypeScript
npm run db:push        # applique le schéma à la base
npm run seed:ciqual    # remplit la base alimentaire
```

## Hors scope (ne pas construire)

Multi-utilisateurs, paiements, app native iOS/Android, micronutriments détaillés, réseau social,
intégration de balances connectées autrement que via Santé.
