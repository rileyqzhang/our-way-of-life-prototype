export type StoryLifeStage = "youth" | "adulthood" | "olderAdulthood" | "";

/**
 * Life-stage headings are matched by text, not by highlight color.
 * Matching ignores case, accents, spacing, and ages written in parentheses.
 * Longer phrases win, so "young adulthood" stays in youth instead of adulthood.
 * Headings that are not listed here stay unstaged and show under Other Stories.
 */
export const lifeStageGroupPhrases: Record<Exclude<StoryLifeStage, "">, string[]> = {
  youth: [
    "young adulthood",
    "childhood",
    "historias de la niñez",
    "early childhood",
    "la niñez",
    "mi niñez",
    "historias de la juventud",
    "adolescence",
    "adolescencia",
    "historias de su infancia y juventud",
  ],
  adulthood: ["adulthood", "historias de la edad de adultos"],
  olderAdulthood: ["later life", "siendo de la tercera edad", "historias de hoy", "la edad avanzada"],
};

/** Section headings that are real groups but do not belong to a life stage. */
export const otherGroupPhrases = [
  "what is civic participation",
  "stories of cp during covid",
  "stories of cp in the context of their social identities",
  "cultural differences",
  "meaning of being able to help",
  "the cost of participation",
  "qué es la participación cívica",
  "qué significa la participación cívica",
  "que significa la participación cívica",
  "participación cívica en los tiempos",
  "significado de poder ayudar",
  "diferencias en culturas",
  "como la identidad afecta la participación",
  "el costo de la participación",
];

export function normalizeGroupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lifeStageForGroup(group: string): StoryLifeStage {
  const name = normalizeGroupText(group);
  if (!name) return "";
  const matches = (Object.entries(lifeStageGroupPhrases) as [Exclude<StoryLifeStage, "">, string[]][])
    .flatMap(([stage, phrases]) => phrases.map((phrase) => ({ stage, phrase: normalizeGroupText(phrase) })))
    .filter((item) => item.phrase && name.includes(item.phrase))
    .sort((a, b) => b.phrase.length - a.phrase.length);
  return matches[0]?.stage || "";
}

export function isOtherGroupHeading(group: string) {
  const name = normalizeGroupText(group);
  if (!name) return false;
  return otherGroupPhrases.some((phrase) => name.includes(normalizeGroupText(phrase)));
}
