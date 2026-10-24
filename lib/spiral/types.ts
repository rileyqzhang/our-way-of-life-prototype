export const spiralCategories = ["rights", "migration", "labor", "culture"] as const;

export type SpiralCategory = (typeof spiralCategories)[number];

export type SpiralEvent = {
  year: number;
  category: SpiralCategory;
  title: string;
  description: string;
  image?: string;
};
