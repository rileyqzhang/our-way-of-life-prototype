import { legacyCollections, type ArchiveCollection } from "@/lib/content/collections";
import { localPages, localSettings, type PageDocument, type SiteSettings } from "@/lib/content/copy";
import { prepareTimeline, storiesFromTimeline, type ArchiveStory, type PreparedTimelineEvent } from "@/lib/content/derive";
import { timelineEvents } from "@/lib/timeline/events";

export type ArchiveContent = {
  source: "sanity" | "local";
  timeline: PreparedTimelineEvent[];
  stories: ArchiveStory[];
  collections: ArchiveCollection[];
  pages: PageDocument[];
  settings: SiteSettings;
};

export function localArchive(): ArchiveContent {
  const timeline = prepareTimeline(timelineEvents);
  return {
    source: "local",
    timeline,
    stories: storiesFromTimeline(timeline),
    collections: legacyCollections,
    pages: localPages,
    settings: localSettings,
  };
}
