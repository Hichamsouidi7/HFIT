# Avancement du projet — HFit

> Ce fichier est la mémoire du projet entre les sessions de travail.
> **À mettre à jour à la fin de chaque session** (Claude : lis-le en début de session, mets-le à
> jour avant chaque commit de fin de fonctionnalité).

Dernière mise à jour : **26 août 2026** — soirée 1 terminée côté code.

## ⏸️ REPRISE — état exact où on s'est arrêté

**Tout le code de la soirée 1 est écrit, le build passe.** Ce qui reste est une suite d'actions
**côté Hicham** (créer les comptes, coller les clés) — voir « Prochaine étape » juste en dessous.

### Prochaine étape : mettre l'app en ligne

Rien n'a encore été testé avec une vraie base de données, parce qu'il n'y en a pas encore.
La séquence, dans cet ordre :

1. **GitHub** — créer le dépôt `hfit` (privé) et y pousser le code.
2. **Vercel** — importer le dépôt.
3. **Neon** — onglet Storage du projet Vercel → créer une base Postgres. Les variables
   d'environnement sont injectées automatiquement.
4. **Variables d'environnement Vercel** à ajouter à la main, **sur le projet** (pas en « Shared ») :
   - `ACCESS_PASSWORD` — le mot de passe de connexion
   - `HEALTH_SYNC_TOKEN` — une longue chaîne aléatoire pour le raccourci iOS
   - `GEMINI_API_KEY` — pas encore utilisée, à ajouter pour la soirée 2
5. **Récupérer `DATABASE_URL`** dans `.env.local` en local, puis :
   ```bash
   npm run db:push        # crée les tables
   npm run seed:ciqual    # remplit les 2 313 aliments
   ```
6. **Tester sur l'iPhone** : ouvrir l'URL Vercel, se connecter, faire l'installation
   (85 kg / 175 cm / 22 ans / objectif 70 kg / Extrême), logger un repas.

### À vérifier au premier test réel

- L'installation crée bien le profil **et** démarre le défi 21 jours (jour 1 = aujourd'hui).
- La recherche d'aliments : taper `poulet`, `riz`, `oeuf` — les aliments simples doivent sortir en
  premier (c'est le classement par pertinence, cf. `searchFoods`).
- L'anneau calorique et les barres de macros bougent après l'ajout d'un repas.
- Le passage minuit : les journées doivent basculer à minuit **heure de Paris**, pas UTC.

## ✅ Soirée 1 — le socle (26 août 2026)

### Moteur de calcul — `src/lib/nutrition.ts`
Le cœur de l'app. Fonctions pures, testées à la main avant d'être branchées.

- **Métabolisme de base** : Mifflin-St Jeor, bascule automatique sur Katch-McArdle si un % de masse
  grasse est renseigné. Pour Hicham : **1 839 kcal**.
- **Dépense calculée par composants** (et non par un « facteur d'activité » vague) :
  base sédentaire + marche + séance. À 15 000 pas + séance : **2 946 kcal**.
  La marche est valorisée à 0,5 kcal/kg/km (net), la foulée dérivée de la taille.
- **Macros** : protéines et lipides d'abord, glucides en reliquat. Trois intensités
  (−25 / −35 / −40 %). En Extrême : **1 767 kcal · 175 g P · 51 g L · 152 g G**.
  Protéines à 2,5 g/kg de poids **cible** (Helms : 2,3–3,1 g/kg de masse maigre, à monter avec la
  sévérité du déficit). **Plancher codé en dur** : jamais sous protéines + lipides minimum.
- **Poids-tendance** : moyenne mobile exponentielle (α = 0,1).
- **Score du jour /100** : pas 30, protéines 30, calories 20, séance 15, eau 5.
- **Auto-pilote hebdo** : compare la perte réelle à la perte visée, corrige — **pas d'abord, food
  ensuite**, et **borné à ±150 kcal et +2 000 pas** par ajustement.

**Trois bugs trouvés et corrigés au test avant de continuer :**
1. Le budget se calculait sur les pas **déjà faits** → il affichait 1 324 kcal au réveil et
   grandissait dans la journée. Corrigé : le budget se calcule sur **l'objectif** de pas
   (`dailyPlan`), et les pas en plus donnent un bonus (`liveBudget`). Un déficit de pas ne retire
   rien : à ce moment-là il a déjà mangé, ça ne ferait que fabriquer un échec.
2. L'auto-pilote proposait **−510 kcal/jour** d'un coup. Borné.
3. Les macros totalisaient 1 767 kcal pendant que la cible affichait 1 768. Les calories sont
   maintenant **dérivées des macros arrondies**, les deux ne peuvent plus diverger.

### Base de données — `src/db/schema.ts`
18 tables définies d'un coup (y compris celles des soirées suivantes, pour éviter d'enchaîner les
migrations). Migration générée : `drizzle/0000_equal_ultragirl.sql`.

Deux choix structurants : les **macros sont copiées** dans `food_entries` (corriger un aliment ne
réécrit pas l'historique), et les **objectifs sont figés** dans `daily_logs` (un jour passé garde
les objectifs sur lesquels il a été noté).

### Base alimentaire
`data/ciqual.json` — **2 298 aliments** extraits de la table CIQUAL 2020 de l'ANSES
(`scripts/build-ciqual.mjs`), plus **15 basiques ajoutés à la main** que CIQUAL 2020 n'a pas
(skyr, whey, flocons d'avoine, konjac…).

**Problème trouvé et corrigé :** une recherche « contient » est inutilisable sur ces données —
`oeuf` remontait « b·oeuf bourguignon », `riz` remontait « riz cantonais » avant le riz nature.
Résolu par une colonne `search_name` normalisée (minuscules, accents retirés, ponctuation → espace)
et un classement par pertinence (nom exact > début de nom > début de mot > n'importe où), les
égalités tranchées par la longueur du nom — le nom le plus court est fiablement l'aliment le plus
simple. Les pluriels sont gérés (`lentilles` → `lentille`).

### Interface
Design refait en cours de soirée sur une **référence visuelle fournie par Hicham** : fond gris
clair, cartes blanches très arrondies à ombres douces, accent corail unique, gros titres noirs
serrés, boutons ronds, navigation flottante sombre. Pas de mode sombre, assumé.

Pages : **Jour** (anneau calorique, macros, résumé en tuiles, pas, poids, eau, séance),
**Manger** (journal + recherche + ajout), **Bouger** (séance du jour détaillée + pas),
**Progrès** (courbe poids/tendance + auto-pilote), plus **installation**, **connexion** et
**réglages Santé**.

### Sécurité
Middleware mot de passe sur tout, sauf `/login`, `/api/login` et `/api/health/sync` (jeton propre).
Session = HMAC de sa propre date d'expiration, en cookie httpOnly, valable 180 jours.
Écrit avec **Web Crypto et non `node:crypto`**, parce que le middleware tourne sur le runtime Edge.

## 🔜 Suite prévue

- **Soirée 2 — saisie rapide** : scan code-barres (Open Food Facts), **photo d'assiette → macros
  par Gemini**, favoris et repas récents, PWA installable, raccourci iOS Santé.
- **Soirée 3 — entraînement** : enregistrement des séries, chrono de repos, surcharge progressive.
- **Soirée 4 — cuisine** : frigo → recette, plan de la semaine, liste de courses.
- **Soirée 5 — pilotage** : application réelle de l'auto-pilote, bilan hebdo IA, écran défi J/21.
- **Soirée 6 — finitions** : notifications push (⚠️ **à faire en dernier** — le VAPID avait bloqué
  plusieurs sessions sur `app_anglais_dev` à cause de variables Vercel « Shared » non rattachées
  au projet), mode hors-ligne, export des données.

## 📌 Dette assumée

- `/bouger` affiche la séance mais **n'enregistre rien** — c'est la soirée 3.
- L'auto-pilote sur `/progres` **affiche** une recommandation mais ne l'applique pas — soirée 5.
- Pas d'icônes PWA ni de manifest — soirée 2.
- Le score du jour ne compte pas encore la séance comme faite (rien ne la marque terminée).
