import type { StoryLanguage } from "@/types/story";

export const pageLanguages = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "zh", label: "中文" },
] as const;

export const storyLanguages: { value: StoryLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "chinese", label: "Chinese" },
  { value: "other", label: "Other" },
];

export const communities = [
  { value: "latine-immigrant-stories", label: "Latine immigrant stories" },
  { value: "african-american-stories", label: "African American stories" },
  { value: "chinese-immigrant-stories", label: "Chinese immigrant stories" },
  { value: "other", label: "Other / not sure" },
] as const;

export const themes = [
  "Altruism",
  "Solidarity",
  "Survival",
  "Empowerment",
  "Rightful Participation",
  "Black Lives Matter",
  "Covid-19 Pandemic",
  "2020 National Crises",
  "Childhood and Young Adulthood",
] as const;

export type CommunityValue = (typeof communities)[number]["value"];
export type ThemeValue = (typeof themes)[number];
