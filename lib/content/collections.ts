export const storyCollections = ["latine", "africanAmerican", "chinese"] as const;

export type StoryCollection = (typeof storyCollections)[number];

export function isStoryCollection(value: string | null | undefined): value is StoryCollection {
  return value === "latine" || value === "africanAmerican" || value === "chinese";
}
