"use client";

import { usePathname } from "next/navigation";

export function isStoryDetailPath(pathname: string) {
  return /^\/(en|es|zh)\/stories\/[^/]+$/.test(pathname);
}

export function HideOnStoryDetail({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isStoryDetailPath(pathname || "")) return null;
  return children;
}
