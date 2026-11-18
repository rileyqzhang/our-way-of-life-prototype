export function openTimelineCard(openIds: readonly string[], id: string) {
  if (openIds.includes(id)) return [...openIds];
  return [...openIds, id];
}

export function closeTimelineCard(openIds: readonly string[], id: string) {
  return openIds.filter((item) => item !== id);
}
