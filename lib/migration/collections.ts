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

export type CollectionDocumentRecord = {
  id: string;
  slug: string;
  name?: string | null;
};

export type StoryReferenceRecord = {
  id: string;
  participantCode?: string | null;
  legacy?: string | null;
  communitySlug?: string | null;
};

export type CollectionReferencePlan = {
  participantCode: string;
  documentId: string;
  legacy: string;
  collectionSlug: string;
  collectionId: string;
  collectionName: string;
};

export function planCollectionReferenceBackfill(stories: StoryReferenceRecord[], collections: CollectionDocumentRecord[]) {
  const publishedCollections = collections.filter((collection) => collection.slug && !collection.id.startsWith("drafts."));
  const bySlug = new Map<string, CollectionDocumentRecord[]>();
  for (const collection of publishedCollections) {
    const list = bySlug.get(collection.slug) || [];
    list.push(collection);
    bySlug.set(collection.slug, list);
  }
  const ready: CollectionReferencePlan[] = [];
  const unmatched: { participantCode: string; documentId: string; legacy: string }[] = [];
  for (const story of stories) {
    if (story.communitySlug?.trim()) continue;
    const legacy = story.legacy?.trim() || "";
    if (!legacy) continue;
    const matches = bySlug.get(legacy) || [];
    if (matches.length !== 1) {
      unmatched.push({ participantCode: story.participantCode?.trim() || story.id, documentId: story.id, legacy });
      continue;
    }
    const collection = matches[0];
    ready.push({
      participantCode: story.participantCode?.trim() || story.id,
      documentId: story.id,
      legacy,
      collectionSlug: collection.slug,
      collectionId: collection.id,
      collectionName: collection.name?.trim() || collection.slug,
    });
  }
  return { ready, unmatched };
}
