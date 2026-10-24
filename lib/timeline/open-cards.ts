export function openTimelineCard(openIds: readonly string[], id: string) {
  return [...openIds.filter((item) => item !== id), id];
}

export function closeTimelineCard(openIds: readonly string[], id: string) {
  return openIds.filter((item) => item !== id);
}
