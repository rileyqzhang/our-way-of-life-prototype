import { prepareTimeline, storiesFromTimeline, type ArchiveStory } from "@/lib/content/derive";
import { timelineEvents } from "@/lib/timeline/events";

const ARCHIVE_ORIGIN = "https://www.ourwayoflifearchive.com";

export function storyUrl(slug: string) {
  return `${ARCHIVE_ORIGIN}/s/stories/${slug}`;
}

export function slugFromHref(href: string) {
  try {
    const parts = new URL(href).pathname.split("/").filter(Boolean);
    return (parts.at(-1) || "").toLowerCase();
  } catch {
    return "";
  }
}

export function timelineStories() {
  const prepared = storiesFromTimeline(prepareTimeline(timelineEvents));
  return new Map(prepared.map((story) => [story.slug, story] as const));
}

export function timelineSlugs(stories: Map<string, ArchiveStory>) {
  return [...stories.keys()].sort();
}
