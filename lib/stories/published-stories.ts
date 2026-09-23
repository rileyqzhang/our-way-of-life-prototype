import type { PublishedStoryCard } from "@/types/story";

/** Participant cards from the current archive prototype. Photos are layout placeholders. */
export const publishedStories: PublishedStoryCard[] = [
  {
    id: "bmnj",
    identifier: "BMNJ",
    quote:
      "Serving our community was a way of life — it's what needs to be done to keep my people alive.",
    location: "Manhattan, NY → Newark, NJ",
    imageAlt: "Placeholder image: courthouse columns, used until a verified participant photo is added.",
    scene: "courthouse",
    href: "/stories",
  },
  {
    id: "mgnj",
    identifier: "MGNJ",
    quote:
      "Colaborar económicamente es la forma en la que me gusta ayudar — esa es la necesidad de la comunidad.",
    location: "El Salvador → New Jersey",
    imageAlt: "Placeholder image: a clinical workspace, used until a verified participant photo is added.",
    scene: "clinic",
    quoteLang: "es",
    comingSoon: true,
  },
  {
    id: "mlnj",
    identifier: "MLNJ",
    quote:
      "It's not just you doing better, you have to reach back with those hands on my board, you got to reach back and pull somebody else with you.",
    location: "Born 1952, New York → New Jersey",
    imageAlt: "Placeholder image: a quiet indoor table, used until a verified participant photo is added.",
    scene: "studio",
    comingSoon: true,
  },
];
