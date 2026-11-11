"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { ArchiveBookTransition } from "@/components/stories/ArchiveBookTransition";
import { type ArchiveTransitionDirection, isPlainClick, markArchiveTransition } from "@/lib/viewTransition";

export function VolumeLink({
  href,
  className,
  transitionName,
  children,
}: {
  href: string;
  className: string;
  transitionName: string;
  children: ReactNode;
}) {
  return (
    <ArchiveBookTransition name={transitionName}>
      <ArchiveTransitionLink className={className} direction="forward" href={href}>
        {children}
      </ArchiveTransitionLink>
    </ArchiveBookTransition>
  );
}

export function ArchiveTransitionLink({
  href,
  className,
  direction,
  children,
}: {
  href: string;
  className?: string;
  direction: ArchiveTransitionDirection;
  children: ReactNode;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isPlainClick(event)) markArchiveTransition(direction);
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {children}
    </Link>
  );
}
