import { cache } from "react";
import { draftMode } from "next/headers";
import type { ArchiveContent } from "@/lib/content/local";
import { localArchive } from "@/lib/content/local";
import { client, previewClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { mapPages, mapSettings, mapStories, mapTimeline, type SanityArchive } from "@/lib/sanity/map";
import { archiveQuery } from "@/lib/sanity/queries";

async function readSanity(): Promise<ArchiveContent | null> {
  if (!client || !isSanityConfigured()) return null;

  try {
    const draft = await draftMode();
    const active = draft.isEnabled ? previewClient() : client;
    if (!active) return null;
    const data = await active.fetch<SanityArchive>(archiveQuery);
    const timeline = mapTimeline(data?.timeline);
    const stories = mapStories(data?.stories);
    if (!timeline.length && !stories.length) return null;
    const local = localArchive();
    return {
      source: "sanity",
      timeline: timeline.length ? timeline : local.timeline,
      stories: stories.length ? stories : local.stories,
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
  return archive.stories.find((story) => story.slug === slug) ?? null;
}
