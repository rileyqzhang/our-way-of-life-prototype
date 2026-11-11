"use client";

import * as React from "react";
import type { ReactNode, ViewTransitionProps } from "react";

function PassThrough({ children }: ViewTransitionProps) {
  return <>{children}</>;
}

const ViewTransition =
  ((React as unknown as Record<string, unknown>)["unstable_ViewTransition"] as React.ComponentType<ViewTransitionProps> | undefined) ?? PassThrough;

export function ArchiveBookTransition({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition default="none" name={name} share="auto">
      {children}
    </ViewTransition>
  );
}
