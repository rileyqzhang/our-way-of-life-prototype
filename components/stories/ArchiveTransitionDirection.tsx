"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { clearArchiveTransition, markArchiveTransition } from "@/lib/viewTransition";

const SHELF_PATH = /^\/[^/]+\/stories\/?$/;
const COLLECTION_PATH = /^\/[^/]+\/stories\/collections\/[^/]+\/?$/;
// Longer than the 450ms forward animation so the CSS durations stay put until it ends.
const CLEAR_AFTER_MS = 700;

export function ArchiveTransitionDirection() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    function onPopState() {
      const from = previousPath.current;
      const to = window.location.pathname;
      if (COLLECTION_PATH.test(from) && SHELF_PATH.test(to)) markArchiveTransition("back");
      else if (SHELF_PATH.test(from) && COLLECTION_PATH.test(to)) markArchiveTransition("forward");
      else clearArchiveTransition();
    }
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, []);

  useLayoutEffect(() => {
    previousPath.current = pathname;
    const direction = document.documentElement.dataset.archiveTransition;
    if (!direction) return;
    if (direction === "back") document.getElementById("archive-shelf")?.scrollIntoView({ block: "start" });
    const timer = window.setTimeout(clearArchiveTransition, CLEAR_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
