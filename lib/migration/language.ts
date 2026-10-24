export type StoryLanguage = "en" | "es" | "zh";

const ENGLISH = new Set(
  "the and of to in that is for with on as was his her they from this how she he it you your were are been have had not but their them would could about when what who which there into than then also just like because people".split(
    " ",
  ),
);

const SPANISH = new Set(
  "el la los las de del que en un una por con para como su sus es está esta más al lo se le les pero porque cuando desde también ella nos ya muy fue era son hay donde años comunidad una".split(
    " ",
  ),
);

const SECTION_LABELS: Record<string, StoryLanguage> = {
  english: "en",
  inglés: "en",
  ingles: "en",
  spanish: "es",
  español: "es",
  espanol: "es",
  chinese: "zh",
  中文: "zh",
};

export function sectionLanguage(text: string): StoryLanguage | undefined {
  const label = text.replace(/\s+/g, " ").trim().toLowerCase().replace(/[:.]+$/g, "");
  return SECTION_LABELS[label];
}

/** Classify an existing paragraph. This does not translate or rewrite it. */
export function detectLanguage(text: string): StoryLanguage | "und" {
  const letters = text.match(/\p{L}/gu) || [];
  if (!letters.length) return "und";
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  if (han / letters.length >= 0.2) return "zh";

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
  let english = 0;
  let spanish = 0;
  for (const word of words) {
    if (ENGLISH.has(word)) english += 1;
    if (SPANISH.has(word)) spanish += 1;
  }
  if (spanish >= 2 && spanish >= english * 2) return "es";
  if (english >= 2 && english >= spanish * 2) return "en";
  if (spanish >= 2 && english === 0) return "es";
  if (english >= 2 && spanish === 0) return "en";
  return "und";
}
