import type { LocalizedText } from "@/lib/timeline/types";

export const storyCollections = ["latine", "africanAmerican", "chinese"] as const;

export type StoryCollection = (typeof storyCollections)[number];

export type ArchiveCollection = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  label: LocalizedText;
  image?: string;
  imageAlt: LocalizedText;
  displayOrder: number;
  theme?: CollectionThemeInput;
};

export type CollectionThemeInput = {
  gradientFrom?: string;
  gradientTo?: string;
  accent?: string;
  muted?: string;
};

export type CollectionTheme = {
  background: string;
  accent: string;
  muted: string;
};

const defaultTheme = {
  gradientFrom: "#5b2509",
  gradientTo: "#2a1004",
  accent: "#D9AD62",
  muted: "#C29A6B",
};

const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

function hex(value: string | undefined, fallback: string) {
  return value && HEX.test(value.trim()) ? value.trim() : fallback;
}

export function collectionTheme(input: CollectionThemeInput | undefined): CollectionTheme {
  const from = hex(input?.gradientFrom, "");
  const to = hex(input?.gradientTo, "");
  const gradientFrom = from || to || defaultTheme.gradientFrom;
  const gradientTo = to || (from ? from : defaultTheme.gradientTo);
  return {
    background: `linear-gradient(145deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
    accent: hex(input?.accent, defaultTheme.accent),
    muted: hex(input?.muted, defaultTheme.muted),
  };
}

const text = (en: string, es: string, zh: string): LocalizedText => ({ en, es, zh });

export type CollectionPageCopy = {
  backLabel: LocalizedText;
  eyebrow: LocalizedText;
  titleSuffix: LocalizedText;
};

export const localCollectionPage: CollectionPageCopy = {
  backLabel: text("Back to Archive Shelf", "Volver al estante del archivo", "返回档案书架"),
  eyebrow: text("Digital Archive", "Archivo digital", "数字档案"),
  titleSuffix: text("Their Words. Their Lives.", "Sus palabras. Sus vidas.", "他们的话。他们的生活。"),
};

function filledOr(value: LocalizedText | undefined, fallback: LocalizedText) {
  return hasText(value) ? (value as LocalizedText) : fallback;
}

export function mergeCollectionPage(remote: Partial<CollectionPageCopy> | null | undefined): CollectionPageCopy {
  return {
    backLabel: filledOr(remote?.backLabel, localCollectionPage.backLabel),
    eyebrow: filledOr(remote?.eyebrow, localCollectionPage.eyebrow),
    titleSuffix: filledOr(remote?.titleSuffix, localCollectionPage.titleSuffix),
  };
}

export const legacyCollections: ArchiveCollection[] = [
  {
    slug: "latine",
    name: text("Latine Immigrant Stories", "Historias de inmigrantes latines", "拉丁裔移民故事"),
    description: text(
      "Oral histories of migration, solidarity, and neighborhood mutual aid.",
      "Historias orales de migración, solidaridad y ayuda mutua en el barrio.",
      "关于迁徙、团结和邻里互助的口述历史。",
    ),
    label: text("Latine", "Latine", "拉丁裔"),
    image: "/timeline/Resized_Resized_20210308_132735003001_1620660343.jpg",
    imageAlt: text(
      "A person standing with boxes of supplies outside a brick building.",
      "Una persona de pie junto a cajas de suministros frente a un edificio de ladrillo.",
      "一个人站在砖楼外，旁边是一箱箱物资。",
    ),
    displayOrder: 0,
  },
  {
    slug: "africanAmerican",
    name: text("African American Stories", "Historias afroamericanas", "非裔美国人故事"),
    description: text(
      "Civil rights organizing, Harlem living memory, and generational service.",
      "Organización por los derechos civiles, memoria viva de Harlem y servicio entre generaciones.",
      "民权组织、哈莱姆的生活记忆，以及代际间的服务。",
    ),
    label: text("African American", "Afroamericana", "非裔美国人"),
    image: "/timeline/2024-11-10_20-46-17_1731300393.jpg",
    imageAlt: text(
      "A black-and-white photograph of people walking along a busy city sidewalk.",
      "Una fotografía en blanco y negro de personas caminando por una acera concurrida.",
      "一张黑白照片，人们走在繁忙的城市人行道上。",
    ),
    displayOrder: 1,
  },
  {
    slug: "chinese",
    name: text("Chinese Immigrant Stories", "Historias de inmigrantes chinos", "华裔移民故事"),
    description: text(
      "Labor history, displacement resilience, and Chinatown mutual aid.",
      "Historia laboral, resiliencia ante el desplazamiento y ayuda mutua en los barrios chinos.",
      "劳工史、面对流离的韧性，以及华埠的互助。",
    ),
    label: text("Chinese", "China", "华裔"),
    image: "/timeline/food-pantry.jpg",
    imageAlt: text(
      "Shelves of canned food and dry goods in a community pantry.",
      "Estantes con comida enlatada y productos secos en una despensa comunitaria.",
      "社区食物储藏室里摆满罐头和干货的货架。",
    ),
    displayOrder: 2,
  },
];

export function isStoryCollection(value: string | null | undefined): value is StoryCollection {
  return value === "latine" || value === "africanAmerican" || value === "chinese";
}

export function collectionDocumentId(slug: string) {
  return `collection-${slug}`;
}

export function storyCollectionSlug(communitySlug: string | null | undefined) {
  const reference = communitySlug?.trim();
  return reference || undefined;
}

function hasText(value: LocalizedText | undefined) {
  return Boolean(value && (value.en.trim() || value.es.trim() || value.zh.trim()));
}

export function mergeCollections(remote: ArchiveCollection[], local: ArchiveCollection[] = legacyCollections) {
  const bySlug = new Map(local.map((collection) => [collection.slug, collection]));
  for (const collection of remote) {
    if (!collection.slug || !hasText(collection.name)) continue;
    const current = bySlug.get(collection.slug);
    bySlug.set(collection.slug, {
      slug: collection.slug,
      name: collection.name,
      description: hasText(collection.description) ? collection.description : current?.description || { en: "", es: "", zh: "" },
      label: hasText(collection.label) ? collection.label : current?.label || collection.name,
      image: collection.image || current?.image,
      imageAlt: hasText(collection.imageAlt) ? collection.imageAlt : current?.imageAlt || { en: "", es: "", zh: "" },
      displayOrder: collection.displayOrder,
      theme: collection.theme,
    });
  }
  return [...bySlug.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug));
}
