import { cache } from "react";
import { draftMode } from "next/headers";
import type { ArchiveContent } from "@/lib/content/local";
import { localArchive } from "@/lib/content/local";
import { client, previewClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { mergeCollections } from "@/lib/content/collections";
import { mapCollections, mapPages, mapSettings, mapStories, mapTimeline, type SanityArchive } from "@/lib/sanity/map";
import { mergeTimeline } from "@/lib/content/derive";
import { canonicalParticipantSlug } from "@/lib/migration/participant-code";
import { archiveQuery } from "@/lib/sanity/queries";

async function previewEnabled() {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

async function readSanity(): Promise<ArchiveContent | null> {
  if (!client || !isSanityConfigured()) return null;

  try {
    const active = (await previewEnabled()) ? previewClient() : client;
    if (!active) return null;
    const data = await active.fetch<SanityArchive>(archiveQuery);
    const timeline = mapTimeline(data?.timeline);
    const stories = mapStories(data?.stories);
    const collections = mapCollections(data?.collections);
    if (!timeline.length && !stories.length && !collections.length) return null;
    const local = localArchive();
    return {
      source: "sanity",
      timeline: mergeTimeline(timeline, local.timeline),
      stories: stories.length ? stories : local.stories,
      collections: mergeCollections(collections, local.collections),
      pages: mapPages(data?.pages),
      settings: mapSettings(data?.settings),
    };
  } catch (error) {
    console.error("Sanity content could not be loaded. Using the local timeline JSON.", error);
    return null;
  }
}

export const getArchive = cache(async (): Promise<ArchiveContent> => {
  return (await readSanity()) ?? localArchive();
});

export async function getStory(slug: string) {
  const archive = await getArchive();
  const direct = archive.stories.find((story) => story.slug === slug);
  if (direct) return direct;
  const canonical = canonicalParticipantSlug(slug);
  if (canonical === slug) return null;
  return (
    archive.stories.find((story) => canonicalParticipantSlug(story.participantCode || story.slug) === canonical) ?? null
  );
}
