"use client";

import type { ReactNode } from "react";

export function StoryFade({ children }: { children: ReactNode }) {
  return <div className="storyFade">{children}</div>;
}
