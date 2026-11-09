import { flushSync } from "react-dom";

export type ArchiveTransitionDirection = "forward" | "back";

export function runArchiveTransition(
  update: () => void,
  direction: ArchiveTransitionDirection,
  afterUpdate?: () => void,
) {
  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!transitionDocument.startViewTransition || reducedMotion) {
    flushSync(update);
    afterUpdate?.();
    return;
  }

  document.documentElement.dataset.archiveTransition = direction;
  const transition = transitionDocument.startViewTransition(() => {
    flushSync(update);
    afterUpdate?.();
  });
  transition.finished.finally(() => {
    delete document.documentElement.dataset.archiveTransition;
  });
}
