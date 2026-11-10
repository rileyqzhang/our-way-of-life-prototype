export const lifeStages = [
  { value: "youth", title: "Youth and Adolescence (-18)" },
  { value: "adulthood", title: "Adulthood (20-59)" },
  { value: "olderAdulthood", title: "Older Adulthood (60+)" },
] as const;

export type LifeStage = (typeof lifeStages)[number]["value"];

export function lifeStageTitle(value: string | null | undefined) {
  return lifeStages.find((stage) => stage.value === value)?.title;
}
