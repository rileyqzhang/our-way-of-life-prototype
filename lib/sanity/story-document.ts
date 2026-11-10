import { cache } from "react";
import { draftMode } from "next/headers";
import type { StoryBlock, StorySegmentSource, StoryText } from "@/lib/content/story-segments";
import { client, previewClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { storyBySlugQuery, storySlugQuery } from "@/lib/sanity/queries";

export type StoryDocument = {
  slug?: string | null;
  participantCode?: string | null;
  title?: StoryText;
  location?: StoryText;
  body?: StoryText;
  article?: { en?: StoryBlock[] | null; es?: StoryBlock[] | null; zh?: StoryBlock[] | null } | null;
  overview?: { en?: StoryBlock[] | null; es?: StoryBlock[] | null; zh?: StoryBlock[] | null } | null;
  collectionSlug?: string | null;
  collectionName?: StoryText;
  photographs?: { image?: { asset?: { _ref?: string } } | null; legacySrc?: string | null; alt?: StoryText }[] | null;
  headline?: StoryText;
  segments?: StorySegmentSource[] | null;
};

function screenshotClient() {
  if (process.env.NODE_ENV === "production" || process.env.ARCHIVE_DRAFT_SCREENSHOTS !== "1") return null;
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!client || !token) return null;
  return client.withConfig({ token, useCdn: false, perspective: "previewDrafts" });
}

async function previewEnabled() {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

export const getStoryDocument = cache(async (slug: string): Promise<StoryDocument | null> => {
  if (!client || !isSanityConfigured()) return null;
  const active = screenshotClient() || ((await previewEnabled()) ? previewClient() : client);
  if (!active) return null;
  try {
    return (await active.fetch<StoryDocument | null>(storyBySlugQuery, { slug: slug.trim().toLowerCase() })) || null;
  } catch (error) {
    console.error("Story could not be loaded.", error);
    return null;
  }
});

export async function publishedStorySlugs() {
  if (!client || !isSanityConfigured()) return [];
  try {
    const slugs = await client.fetch<string[]>(storySlugQuery);
    return (slugs || []).map((slug) => slug.trim()).filter(Boolean);
  } catch (error) {
    console.error("Story addresses could not be loaded.", error);
    return [];
  }
}
