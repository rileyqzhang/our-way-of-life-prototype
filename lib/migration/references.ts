export type DocumentReference = { _key?: string; _type: "reference"; _ref: string };

export type TimelineLinkState = {
  blocks: { _key?: string; story?: { _ref?: string } }[];
  relatedStories: { _ref?: string }[];
};

export function referencedIds(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) referencedIds(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  const record = value as { _type?: unknown; _ref?: unknown };
  if (record._type === "reference" && typeof record._ref === "string") found.add(record._ref);
  for (const item of Object.values(record)) referencedIds(item, found);
  return found;
}

export function hasWeakReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasWeakReference(item));
  if (!value || typeof value !== "object") return false;
  const record = value as { _weak?: unknown };
  if (record._weak === true) return true;
  return Object.values(record).some((item) => hasWeakReference(item));
}

function unavailableStoryReference(value: unknown, availableStoryIds: Set<string>) {
  if (!value || typeof value !== "object") return false;
  const record = value as { _type?: unknown; _ref?: unknown };
  return (
    record._type === "reference" &&
    typeof record._ref === "string" &&
    record._ref.startsWith("story-") &&
    !availableStoryIds.has(record._ref)
  );
}

function omit(value: unknown, availableStoryIds: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !unavailableStoryReference(item, availableStoryIds))
      .map((item) => omit(item, availableStoryIds));
  }
  if (!value || typeof value !== "object") return value;
  if (unavailableStoryReference(value, availableStoryIds)) return undefined;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const child = omit(item, availableStoryIds);
    if (child !== undefined) next[key] = child;
  }
  return next;
}

export function omitUnavailableStoryReferences<T>(value: T, availableStoryIds: Set<string>): T {
  return omit(value, availableStoryIds) as T;
}

export function timelineStoryBackLink(
  source: { blocks?: { _key?: string; story?: { _ref?: string } }[]; relatedStories?: DocumentReference[] },
  live: TimelineLinkState,
  sourceStoryId: string,
  actualStoryId: string,
): { blockKey?: string; related?: DocumentReference } | null {
  const sourceBlock = source.blocks?.find((block) => block.story?._ref === sourceStoryId);
  const sourceRelated = source.relatedStories?.find((item) => item._ref === sourceStoryId);
  const liveBlock = sourceBlock?._key ? live.blocks.find((block) => block._key === sourceBlock._key) : undefined;
  const blockKey = liveBlock && !liveBlock.story?._ref ? sourceBlock?._key : undefined;
  const alreadyRelated = live.relatedStories.some((item) => item._ref === actualStoryId);
  const related = sourceRelated && !alreadyRelated ? { ...sourceRelated, _type: "reference" as const, _ref: actualStoryId } : undefined;
  if (!blockKey && !related) return null;
  return { blockKey, related };
}
