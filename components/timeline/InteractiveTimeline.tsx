"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LinearTimeline } from "@/components/timeline/LinearTimeline";
import { SpiralCard } from "@/components/timeline/SpiralCard";
import { VortexCanvas, type VortexPoint } from "@/components/timeline/VortexCanvas";
import { scrollProgressFor, toVortexNodes } from "@/components/timeline/vortex-model";
import type { Locale } from "@/lib/i18n";
import type { StoryRef } from "@/lib/timeline/card-content";
import { closeTimelineCard, openTimelineCard } from "@/lib/timeline/open-cards";
import type { TimelineEvent } from "@/lib/timeline/types";

const chrome = {
  en: {
    archive: "Our Way of Life Archive",
    viewLabel: "Timeline view",
    vortex: "Spiral timeline",
    linear: "Linear timeline",
    scroll: "Scroll to traverse decades",
    stories: "Timeline stories",
    cardsOpen: (count: number) => `${count} Cards Open`,
    closeAll: "Close All",
  },
  es: {
    archive: "Archivo Our Way of Life",
    viewLabel: "Vista de la línea de tiempo",
    vortex: "Línea en espiral",
    linear: "Línea lineal",
    scroll: "Desplázate para recorrer las décadas",
    stories: "Historias de la línea de tiempo",
    cardsOpen: (count: number) => `${count} tarjetas abiertas`,
    closeAll: "Cerrar todas",
  },
  zh: {
    archive: "我们的生活方式档案",
    viewLabel: "时间线视图",
    vortex: "螺旋时间线",
    linear: "线性时间线",
    scroll: "滚动穿越年代",
    stories: "时间线故事",
    cardsOpen: (count: number) => `已打开 ${count} 张`,
    closeAll: "全部关闭",
  },
} as const;

export function InteractiveTimeline({
  events,
  lang,
  stories = [],
}: {
  events: TimelineEvent[];
  lang: Locale;
  stories?: readonly StoryRef[];
}) {
  const copy = chrome[lang];
  const nodes = useMemo(() => toVortexNodes(events, lang), [events, lang]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, VortexPoint>>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"vortex" | "linear">("vortex");
  const progressRef = useRef(0);
  const diveFrame = useRef<number | null>(null);
  const labelId = useId();
  const openIdsRef = useRef<string[]>([]);
  const activeRef = useRef<string | null>(null);
  openIdsRef.current = openIds;
  activeRef.current = activeId;
  if (!diveFrame.current) progressRef.current = scrollProgress;

  const stopDive = () => {
    if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    diveFrame.current = null;
  };

  const animateTo = (target: number) => {
    if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    const start = progressRef.current;
    const from = performance.now();
    const duration = Math.min(1500, Math.max(720, Math.abs(target - start) * 1600));
    const tick = (now: number) => {
      const t = Math.min(1, (now - from) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      const next = start + (target - start) * eased;
      progressRef.current = next;
      setScrollProgress(next);
      if (t < 1) {
        diveFrame.current = requestAnimationFrame(tick);
        return;
      }
      diveFrame.current = null;
    };
    diveFrame.current = requestAnimationFrame(tick);
  };

  const openCard = (id: string) => {
    setOpenIds((ids) => openTimelineCard(ids, id));
    setActiveId(id);
  };

  const closeCard = (id: string) => {
    const next = closeTimelineCard(openIdsRef.current, id);
    setOpenIds(next);
    if (activeRef.current === id) setActiveId(next.at(-1) ?? null);
  };

  const openedHash = useRef(false);
  useEffect(() => {
    if (openedHash.current) return;
    const id = window.location.hash.replace("#", "");
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    openedHash.current = true;
    openCard(node.id);
    animateTo(scrollProgressFor(node.spiralParam));
  }, [nodes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      stopDive();
      const current = activeRef.current ?? openIdsRef.current.at(-1);
      if (!current) return;
      const next = closeTimelineCard(openIdsRef.current, current);
      setOpenIds(next);
      setActiveId(next.at(-1) ?? null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    };
  }, []);

  const scrollBy = (delta: number) => {
    stopDive();
    const next = Math.max(0, Math.min(1.05, progressRef.current + delta));
    progressRef.current = next;
    setScrollProgress(next);
  };

  return (
    <div className={view === "vortex" ? "timelineShell isVortex" : "timelineShell"}>
      <div className="timelineViewTabs" role="tablist" aria-label={copy.viewLabel}>
        <button type="button" role="tab" aria-selected={view === "vortex"} onClick={() => setView("vortex")}>
          {copy.vortex}
        </button>
        <button type="button" role="tab" aria-selected={view === "linear"} onClick={() => setView("linear")}>
          {copy.linear}
        </button>
      </div>
      {view === "linear" ? (
        <LinearTimeline events={events} lang={lang} stories={stories} />
      ) : (
        <section className="vortexStage" aria-labelledby={labelId}>
          <h1 id={labelId} className="visuallyHidden">
            {copy.archive}
          </h1>

          <VortexCanvas
            hoveredId={hoveredId}
            nodes={nodes}
            onHover={setHoveredId}
            onOpen={openCard}
            onPositions={setPositions}
            onScrollDelta={scrollBy}
            scrollProgress={scrollProgress}
          />

          {openIds.length > 1 ? (
            <div className="spiralCardTray">
              <span>{copy.cardsOpen(openIds.length)}</span>
              <button type="button" onClick={() => { setOpenIds([]); setActiveId(null); }}>
                {copy.closeAll}
              </button>
            </div>
          ) : null}

          {openIds.map((id, index) => {
            const event = events.find((item) => item.id === id);
            const position = positions[id];
            if (!event || !position?.visible) return null;
            return (
              <SpiralCard
                active={id === activeId}
                event={event}
                key={id}
                lang={lang}
                stories={stories}
                onClose={() => closeCard(id)}
                onFocus={() => setActiveId(id)}
                position={position}
                stackOrder={index}
              />
            );
          })}

          <button
            type="button"
            className="vortexScroll"
            onClick={() => animateTo(progressRef.current >= 0.85 ? 0 : Math.min(1.05, progressRef.current + 0.18))}
          >
            {copy.scroll} {scrollProgress >= 0.85 ? "↑" : "↓"}
          </button>

          <div className="visuallyHidden">
            <h2>{copy.stories}</h2>
            <ul>
              {nodes.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => openCard(node.id)}>
                    {node.date}. {node.headline}
                  </button>
                  <p>{node.excerpt}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
