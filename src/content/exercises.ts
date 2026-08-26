/**
 * Exercise catalogue.
 *
 * Curated by hand rather than pulled from an API: the free exercise databases
 * are English-only, full of near-duplicates, and none of them carry the one
 * thing that actually matters when training alone — a cue that stops you doing
 * the movement badly.
 */

export type MuscleGroup =
  | "pectoraux"
  | "dos"
  | "jambes"
  | "epaules"
  | "bras"
  | "gainage"
  | "cardio";

export type Equipment = "barre" | "halteres" | "machine" | "poulie" | "poids-du-corps" | "aucun";

export interface ExerciseDef {
  slug: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCompound: boolean;
  cues: string;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  jambes: "Jambes",
  epaules: "Épaules",
  bras: "Bras",
  gainage: "Gainage",
  cardio: "Cardio",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barre: "Barre",
  halteres: "Haltères",
  machine: "Machine",
  poulie: "Poulie",
  "poids-du-corps": "Poids du corps",
  aucun: "Sans matériel",
};

export const EXERCISES: ExerciseDef[] = [
  // --- Pectoraux ---
  { slug: "developpe-couche", name: "Développé couché", muscleGroup: "pectoraux", equipment: "barre", isCompound: true, cues: "Omoplates serrées et bloquées, barre au bas des pectoraux, pieds ancrés au sol." },
  { slug: "developpe-incline-halteres", name: "Développé incliné haltères", muscleGroup: "pectoraux", equipment: "halteres", isCompound: true, cues: "Banc à 30°. Descends jusqu'à sentir l'étirement, sans cogner les haltères en haut." },
  { slug: "developpe-couche-halteres", name: "Développé couché haltères", muscleGroup: "pectoraux", equipment: "halteres", isCompound: true, cues: "Plus d'amplitude que la barre. Coudes à 45° du corps, pas écartés à 90°." },
  { slug: "developpe-machine", name: "Développé machine", muscleGroup: "pectoraux", equipment: "machine", isCompound: true, cues: "Utile en fin de séance : tu peux aller à l'échec sans risque." },
  { slug: "ecarte-poulie", name: "Écarté à la poulie", muscleGroup: "pectoraux", equipment: "poulie", isCompound: false, cues: "Coudes légèrement fléchis et FIXES. C'est un mouvement d'épaule, pas de bras." },
  { slug: "dips", name: "Dips", muscleGroup: "pectoraux", equipment: "poids-du-corps", isCompound: true, cues: "Buste penché en avant pour les pectoraux, buste droit pour les triceps." },
  { slug: "pompes", name: "Pompes", muscleGroup: "pectoraux", equipment: "poids-du-corps", isCompound: true, cues: "Corps gainé en planche. Si c'est trop facile, ralentis la descente à 3 secondes." },

  // --- Dos ---
  { slug: "souleve-de-terre", name: "Soulevé de terre", muscleGroup: "dos", equipment: "barre", isCompound: true, cues: "Dos plat, barre contre les tibias, on pousse le sol avec les pieds. Le mouvement le plus lourd de la semaine." },
  { slug: "souleve-de-terre-roumain", name: "Soulevé de terre roumain", muscleGroup: "dos", equipment: "barre", isCompound: true, cues: "Jambes presque tendues, on pousse les hanches en arrière. La barre frôle les cuisses." },
  { slug: "tractions", name: "Tractions", muscleGroup: "dos", equipment: "poids-du-corps", isCompound: true, cues: "Menton au-dessus de la barre. Si tu n'y arrives pas, fais la descente lentement (5 s)." },
  { slug: "tirage-vertical", name: "Tirage vertical", muscleGroup: "dos", equipment: "poulie", isCompound: true, cues: "Tire avec les coudes vers les hanches, pas avec les mains. Poitrine sortie." },
  { slug: "rowing-barre", name: "Rowing barre", muscleGroup: "dos", equipment: "barre", isCompound: true, cues: "Buste à 45°, dos plat. Tire vers le nombril, pas vers la poitrine." },
  { slug: "rowing-haltere", name: "Rowing haltère unilatéral", muscleGroup: "dos", equipment: "halteres", isCompound: true, cues: "Un genou sur le banc. Ne fais pas tourner le buste pour tricher." },
  { slug: "tirage-horizontal", name: "Tirage horizontal poulie", muscleGroup: "dos", equipment: "poulie", isCompound: true, cues: "Buste immobile. Serre les omoplates une seconde en fin de mouvement." },
  { slug: "face-pull", name: "Face pull", muscleGroup: "dos", equipment: "poulie", isCompound: false, cues: "Tire vers le front, coudes hauts. C'est ce qui compense les heures assis." },
  { slug: "shrugs", name: "Shrugs (trapèzes)", muscleGroup: "dos", equipment: "halteres", isCompound: false, cues: "Monte les épaules vers les oreilles, sans rouler. Pause en haut." },

  // --- Jambes ---
  { slug: "squat", name: "Squat barre", muscleGroup: "jambes", equipment: "barre", isCompound: true, cues: "Descends au moins jusqu'à la cuisse parallèle. Genoux dans l'axe des pieds." },
  { slug: "squat-gobelet", name: "Squat gobelet", muscleGroup: "jambes", equipment: "halteres", isCompound: true, cues: "Haltère contre la poitrine. Idéal pour apprendre la profondeur sans se charger le dos." },
  { slug: "presse-a-cuisses", name: "Presse à cuisses", muscleGroup: "jambes", equipment: "machine", isCompound: true, cues: "Ne verrouille jamais les genoux en fin de poussée. Bas du dos collé au dossier." },
  { slug: "fentes-marchees", name: "Fentes marchées", muscleGroup: "jambes", equipment: "halteres", isCompound: true, cues: "Grand pas, genou arrière proche du sol. Buste droit." },
  { slug: "fentes-bulgares", name: "Fentes bulgares", muscleGroup: "jambes", equipment: "halteres", isCompound: true, cues: "Pied arrière sur un banc. Brutal et très efficace, commence léger." },
  { slug: "hip-thrust", name: "Hip thrust", muscleGroup: "jambes", equipment: "barre", isCompound: true, cues: "Dos appuyé sur le banc, menton rentré. Serre les fessiers une seconde en haut." },
  { slug: "leg-curl", name: "Leg curl (ischios)", muscleGroup: "jambes", equipment: "machine", isCompound: false, cues: "Contrôle la phase de retour, c'est là que le muscle travaille le plus." },
  { slug: "leg-extension", name: "Leg extension", muscleGroup: "jambes", equipment: "machine", isCompound: false, cues: "Pause en haut. Sers-t'en pour finir les quadriceps, pas pour les démarrer." },
  { slug: "mollets-debout", name: "Mollets debout", muscleGroup: "jambes", equipment: "machine", isCompound: false, cues: "Amplitude complète : talon très bas, puis très haut. Séries longues." },

  // --- Épaules ---
  { slug: "developpe-militaire", name: "Développé militaire", muscleGroup: "epaules", equipment: "barre", isCompound: true, cues: "Abdos serrés pour ne pas cambrer. La barre passe devant le visage puis au-dessus." },
  { slug: "developpe-halteres-epaules", name: "Développé épaules haltères", muscleGroup: "epaules", equipment: "halteres", isCompound: true, cues: "Descends les coudes au niveau des oreilles, pas plus bas." },
  { slug: "elevations-laterales", name: "Élévations latérales", muscleGroup: "epaules", equipment: "halteres", isCompound: false, cues: "Léger. Monte jusqu'à l'horizontale, pas plus haut. Ne balance pas le corps." },
  { slug: "oiseau", name: "Oiseau (épaules arrière)", muscleGroup: "epaules", equipment: "halteres", isCompound: false, cues: "Buste penché, on écarte les bras. Très léger, séries longues." },

  // --- Bras ---
  { slug: "curl-halteres", name: "Curl biceps haltères", muscleGroup: "bras", equipment: "halteres", isCompound: false, cues: "Coudes collés au corps. Pas d'élan avec le dos." },
  { slug: "curl-barre", name: "Curl barre", muscleGroup: "bras", equipment: "barre", isCompound: false, cues: "Descends complètement à chaque répétition." },
  { slug: "curl-marteau", name: "Curl marteau", muscleGroup: "bras", equipment: "halteres", isCompound: false, cues: "Paumes face à face. Cible l'avant-bras et l'épaisseur du bras." },
  { slug: "extensions-triceps-poulie", name: "Extensions triceps poulie", muscleGroup: "bras", equipment: "poulie", isCompound: false, cues: "Coudes verrouillés le long du corps. Seul l'avant-bras bouge." },
  { slug: "barre-au-front", name: "Barre au front", muscleGroup: "bras", equipment: "barre", isCompound: false, cues: "Coudes fixes et pointés au plafond. Descends vers le front, pas vers le menton." },
  { slug: "dips-banc", name: "Dips sur banc", muscleGroup: "bras", equipment: "poids-du-corps", isCompound: false, cues: "Corps proche du banc. Descends jusqu'à 90° au coude." },

  // --- Gainage ---
  { slug: "planche", name: "Planche", muscleGroup: "gainage", equipment: "aucun", isCompound: false, cues: "Fessiers serrés, bassin rentré. Mieux vaut 30 s parfaites que 2 min affaissées." },
  { slug: "planche-laterale", name: "Planche latérale", muscleGroup: "gainage", equipment: "aucun", isCompound: false, cues: "Hanche haute. Une des rares choses qui travaille vraiment les obliques." },
  { slug: "releves-jambes", name: "Relevés de jambes suspendu", muscleGroup: "gainage", equipment: "poids-du-corps", isCompound: false, cues: "Enroule le bassin en fin de mouvement, sinon ce sont les hanches qui travaillent." },
  { slug: "crunch-poulie", name: "Crunch à la poulie", muscleGroup: "gainage", equipment: "poulie", isCompound: false, cues: "Le seul abdo qu'on peut charger progressivement. Enroule le dos." },
  { slug: "hollow-hold", name: "Hollow hold", muscleGroup: "gainage", equipment: "aucun", isCompound: false, cues: "Bas du dos plaqué au sol. Si il décolle, remonte les jambes." },

  // --- Cardio ---
  { slug: "marche-inclinee", name: "Marche inclinée (tapis)", muscleGroup: "cardio", equipment: "machine", isCompound: false, cues: "Inclinaison 10-12 %, vitesse 5-6 km/h, sans se tenir. Le meilleur cardio en sèche : ça brûle sans épuiser." },
  { slug: "velo", name: "Vélo", muscleGroup: "cardio", equipment: "machine", isCompound: false, cues: "Allure conversationnelle. Ça n'entame pas la récupération des jambes." },
  { slug: "rameur", name: "Rameur", muscleGroup: "cardio", equipment: "machine", isCompound: false, cues: "Jambes, puis dos, puis bras. Retour dans l'ordre inverse." },
  { slug: "corde-a-sauter", name: "Corde à sauter", muscleGroup: "cardio", equipment: "aucun", isCompound: false, cues: "Petits sauts, poignets souples. Dense en calories sur peu de temps." },
];

export function exercisesByGroup(group: MuscleGroup): ExerciseDef[] {
  return EXERCISES.filter((e) => e.muscleGroup === group);
}

export function findExercise(slug: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}
