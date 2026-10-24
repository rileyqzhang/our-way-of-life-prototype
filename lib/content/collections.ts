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
};

const text = (en: string, es: string, zh: string): LocalizedText => ({ en, es, zh });

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

export function storyCollectionSlug(communitySlug: string | null | undefined, legacy: string | null | undefined) {
  const reference = communitySlug?.trim();
  if (reference) return reference;
  return isStoryCollection(legacy) ? legacy : undefined;
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
    });
  }
  return [...bySlug.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug));
}
