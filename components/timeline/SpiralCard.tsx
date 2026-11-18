"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimelineNarrative } from "@/components/timeline/TimelineNarrative";
import type { VortexPoint } from "@/components/timeline/VortexCanvas";
import type { Locale } from "@/lib/i18n";
import type { StoryRef } from "@/lib/timeline/card-content";
import type { TimelineEvent } from "@/lib/timeline/types";

const archiveLabel = { en: "Archive", es: "Archivo", zh: "\u6863\u6848" } as const;
const tapeLabel = { en: "Tape Archive", es: "Archivo en cinta", zh: "\u5f55\u97f3\u6863\u6848" } as const;

export function SpiralCard({
  event,
  lang,
  stories = [],
  position,
  stackOrder,
  active,
  onFocus,
  onClose,
}: {
  event: TimelineEvent;
  lang: Locale;
  stories?: readonly StoryRef[];
  position: VortexPoint;
  stackOrder: number;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
}) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [layout, setLayout] = useState({ x: 16, y: 64 });
  const dragStart = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });
  const width = 320;

  useEffect(() => {
    const cardWidth = 320;
    const estimatedHeight = 533;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const headerBottom = document.querySelector(".archiveHeader")?.getBoundingClientRect().bottom ?? 0;
    const topMin = Math.max(64, headerBottom);
    const centerX = winW * 0.5;
    const centerY = winH * 0.5;
    const centerExclusionRadius = 110;
    const dx = position.x - centerX;
    const dy = position.y - centerY;

    let posX = 0;
    if (dx >= 0) {
      posX = Math.max(position.x + 32, centerX + centerExclusionRadius);
      if (posX + cardWidth > winW - 16) posX = Math.max(16, position.x - cardWidth - 28);
    } else {
      posX = Math.min(position.x - cardWidth - 32, centerX - centerExclusionRadius - cardWidth);
      if (posX < 16) posX = Math.min(winW - cardWidth - 16, position.x + 28);
    }

    const staggerY = (stackOrder % 4) * 20;
    let posY = position.y - estimatedHeight * 0.38 + staggerY;
    if (Math.abs(posX + cardWidth / 2 - centerX) < centerExclusionRadius) {
      if (dy >= 0) posY = Math.max(posY, centerY + centerExclusionRadius * 0.6);
      else posY = Math.min(posY, centerY - centerExclusionRadius * 0.6 - estimatedHeight);
    }

    posY = Math.max(topMin, Math.min(winH - estimatedHeight - 20, posY));
    posX = Math.max(16, Math.min(winW - cardWidth - 16, posX));
    setLayout({ x: posX, y: posY });
  }, [position.x, position.y, stackOrder]);

  const currentX = dragOffset ? dragOffset.x : layout.x;
  const currentY = dragOffset ? dragOffset.y : layout.y;

  const onMouseMove = useCallback(
    (mouseEvent: MouseEvent) => {
      if (!isDragging) return;
      const topMin = Math.max(60, document.querySelector(".archiveHeader")?.getBoundingClientRect().bottom ?? 0);
      const dx = mouseEvent.clientX - dragStart.current.mouseX;
      const dy = mouseEvent.clientY - dragStart.current.mouseY;
      const x = Math.max(10, Math.min(window.innerWidth - width - 10, dragStart.current.initialX + dx));
      const y = Math.max(topMin, Math.min(window.innerHeight - 150, dragStart.current.initialY + dy));
      setDragOffset({ x, y });
    },
    [isDragging],
  );

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const anchorX = position.x < currentX ? currentX : currentX + width;
  const anchorY = Math.max(currentY + 28, Math.min(currentY + 360, position.y));
  const closeLabel = lang === "zh" ? "\u5173\u95ed" : lang === "es" ? "Cerrar" : "Close";

  return (
    <>
      <svg
        aria-hidden="true"
        className={active ? "spiralLeader isActive" : "spiralLeader"}
        style={{ zIndex: active ? 21 : 20 }}
      >
        <line x1={position.x} x2={anchorX} y1={position.y} y2={anchorY} />
        <circle cx={anchorX} cy={anchorY} r={active ? 3 : 2} />
        <circle cx={position.x} cy={position.y} r="3" />
      </svg>
      <aside
        className={active ? "spiralCard isActive" : "spiralCard"}
        style={{
          left: currentX,
          top: currentY,
          zIndex: active ? 40 : 30 + (stackOrder % 6),
          cursor: isDragging ? "grabbing" : undefined,
        }}
        aria-label={`${event.date} ${archiveLabel[lang]}`}
        onMouseDown={onFocus}
      >
        <div className="spiralCardFrame">
          <div
            className="spiralCardBar"
            onMouseDown={(mouseEvent) => {
              if (mouseEvent.button !== 0) return;
              const target = mouseEvent.target as HTMLElement;
              if (target.closest("button") || target.closest("iframe")) return;
              onFocus();
              setIsDragging(true);
              dragStart.current = { mouseX: mouseEvent.clientX, mouseY: mouseEvent.clientY, initialX: currentX, initialY: currentY };
            }}
          >
            <span>
              <MoveIcon />
              {event.date} {archiveLabel[lang]}
            </span>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onClose();
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="spiralCardBody">
            <TimelineNarrative event={event} lang={lang} stories={stories} />
          </div>
          <div className="spiralCardFoot">
            <span>{tapeLabel[lang]}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function MoveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12">
      <path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
