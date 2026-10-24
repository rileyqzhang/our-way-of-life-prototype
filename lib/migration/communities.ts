import type { StoryCollection } from "@/lib/content/collections";
import { canonicalParticipantSlug } from "@/lib/migration/participant-code";
import { africanAmericanSources } from "@/lib/migration/docx-sources";

export type VerifiedCommunity = {
  slug: string;
  collection: StoryCollection;
  source: string;
};

const AFRICAN_AMERICAN = "African American Stories Google Drive group supplied for this import";

export const verifiedCommunities: VerifiedCommunity[] = africanAmericanSources.map((source) => ({
  slug: canonicalParticipantSlug(source.originalCode),
  collection: source.community,
  source: source.filename
    ? `${AFRICAN_AMERICAN}. Original file ${source.filename}. Drive id ${source.driveId}.`
    : `${AFRICAN_AMERICAN}. Drive folder ${source.driveId} for ${source.originalCode}.`,
}));

export function verifiedCommunityFor(slug: string) {
  const canonical = canonicalParticipantSlug(slug);
  return verifiedCommunities.find((item) => item.slug === canonical);
}
