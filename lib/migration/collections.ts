import { collectionDocumentId, isStoryCollection, legacyCollections, type StoryCollection } from "@/lib/content/collections";

export type CollectionStoryRecord = {
  id: string;
  legacy?: string | null;
  communitySlug?: string | null;
};

export type CollectionPresence = {
  slug: string;
  published: boolean;
  draft: boolean;
};

export type CollectionPlanRow = {
  slug: string;
  documentId: string;
  draftId: string;
  action: "Preserve" | "CreateDraft";
  displayOrder: number;
};

export type StoryLinkRow = {
  id: string;
  legacy: string;
  action: "Skip" | "Wait" | "LinkDraft";
  reason: string;
  referenceId?: string;
};

export function collectionDraft(slug: StoryCollection) {
  const source = legacyCollections.find((collection) => collection.slug === slug);
  if (!source) throw new Error(`Unknown collection ${slug}`);
  return {
    _id: `drafts.${collectionDocumentId(slug)}`,
    _type: "collection" as const,
    name: { _type: "localeString" as const, ...source.name },
    description: { _type: "localeText" as const, ...source.description },
    slug: { _type: "slug" as const, current: slug },
    displayOrder: source.displayOrder,
  };
}

export function planCollections(existing: CollectionPresence[]): CollectionPlanRow[] {
  return legacyCollections.map((collection) => {
    const found = existing.find((item) => item.slug === collection.slug);
    const action = found?.published || found?.draft ? "Preserve" : "CreateDraft";
    return {
      slug: collection.slug,
      documentId: collectionDocumentId(collection.slug),
      draftId: `drafts.${collectionDocumentId(collection.slug)}`,
      action,
      displayOrder: collection.displayOrder,
    };
  });
}

export function planStoryLinks(stories: CollectionStoryRecord[], publishedSlugs: string[]): StoryLinkRow[] {
  return stories.map((story) => {
    const legacy = story.legacy?.trim() || "";
    if (!isStoryCollection(legacy)) {
      return { id: story.id, legacy, action: "Skip", reason: "No verified legacy community is stored on this story." };
    }
    if (story.communitySlug?.trim()) {
      return { id: story.id, legacy, action: "Skip", reason: "A collection reference is already set." };
    }
    if (!publishedSlugs.includes(legacy)) {
      return {
        id: story.id,
        legacy,
        action: "Wait",
        reason: "The collection document is not published, so no story reference was written.",
      };
    }
    if (!story.id.startsWith("drafts.")) {
      return { id: story.id, legacy, action: "Skip", reason: "The published story is left unchanged." };
    }
    return {
      id: story.id,
      legacy,
      action: "LinkDraft",
      reason: "The draft can store a reference without changing the published story.",
      referenceId: collectionDocumentId(legacy),
    };
  });
}

export function collectionRowIsApproved(row: CollectionPlanRow, only: Set<string> | undefined) {
  return row.action === "CreateDraft" && (!only || only.has(row.slug));
}
