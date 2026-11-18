const namedArchiveBooks = {
  latine: "archive-book-latine",
  africanAmerican: "archive-book-african-american",
  chinese: "archive-book-chinese",
} as const;

export function volumeTransitionName(slug: string) {
  if (slug in namedArchiveBooks) return namedArchiveBooks[slug as keyof typeof namedArchiveBooks];
  const safe = slug.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `archive-book-${safe || "collection"}`;
}

export type ArchiveTransitionDirection = "forward" | "back";

export function markArchiveTransition(direction: ArchiveTransitionDirection) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    clearArchiveTransition();
    return;
  }
  document.documentElement.dataset.archiveTransition = direction;
}

export function clearArchiveTransition() {
  delete document.documentElement.dataset.archiveTransition;
}

export function isPlainClick(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
