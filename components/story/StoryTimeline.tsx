"use client";

import { useEffect, useRef, useState } from "react";

export type StoryTimelineStage = {
  id: string;
  title: string;
  empty: boolean;
  segments: { id: string; label: string }[];
};

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function StoryTimeline({ stages }: { stages: StoryTimelineStage[] }) {
  const firstOpen = stages.find((stage) => !stage.empty)?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => (firstOpen ? { [firstOpen]: true } : {}));
  const [activeId, setActiveId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const previousStage = useRef("");
  const highlightTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".archiveHeader");
    if (!header) return;
    const apply = () => {
      document.documentElement.style.setProperty("--site-header-height", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-story-segment]")];
    if (!nodes.length) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-story-segment") || "";
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const current = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        if (current) setActiveId(current[0]);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [stages]);

  const activeStage = stages.find((stage) => stage.segments.some((segment) => segment.id === activeId))?.id || "";

  useEffect(() => {
    if (!activeStage || previousStage.current === activeStage) return;
    previousStage.current = activeStage;
    setOpen((current) => ({ ...current, [activeStage]: true }));
  }, [activeStage]);

  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    setMenuOpen(false);
    const next = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", next);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const header = document.querySelector<HTMLElement>(".archiveHeader");
        const offset = Math.ceil(header?.getBoundingClientRect().height || 0) + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
        const heading = target.querySelector("h3");
        const showHighlight = () => {
          document.querySelectorAll(".storySegment.isJumpTarget").forEach((node) => node.classList.remove("isJumpTarget"));
          target.classList.add("isJumpTarget");
          window.clearTimeout(highlightTimer.current);
          highlightTimer.current = window.setTimeout(() => target.classList.remove("isJumpTarget"), 1800);
          if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
        };
        if (reducedMotion()) {
          showHighlight();
          return;
        }
        const watch = () => {
          if (Math.abs(target.getBoundingClientRect().top - offset) > 16) return;
          window.removeEventListener("scroll", watch);
          showHighlight();
        };
        window.addEventListener("scroll", watch, { passive: true });
        window.setTimeout(() => {
          window.removeEventListener("scroll", watch);
          showHighlight();
        }, 1500);
      });
    });
  }

  return (
    <nav className={`storyTimeline ${menuOpen ? "isOpen" : ""}`} aria-label="Story timeline">
      <button
        type="button"
        className="storyTimelineMenu"
        aria-expanded={menuOpen}
        aria-controls="story-timeline-panel"
        onClick={() => setMenuOpen((value) => !value)}
      >
        Story timeline
      </button>
      <div className="storyTimelinePanel" id="story-timeline-panel">
        <div className="storyTimelineTrack">
          <div className="storySidebarLine" aria-hidden="true" />
          <ol>
            {stages.map((stage) => {
              const isOpen = Boolean(open[stage.id]);
              const panelId = `story-stage-${stage.id}`;
              const stageCurrent = stage.id === activeStage;
              return (
                <li key={stage.id} className={stageCurrent ? "isActive" : undefined}>
                  <span className="storySidebarDot" aria-hidden="true" />
                  {stage.empty ? (
                    <button type="button" className="storyStageToggle" disabled>
                      {stage.title}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="storyStageToggle"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-current={stageCurrent ? "true" : undefined}
                      onClick={() => setOpen((current) => ({ ...current, [stage.id]: !current[stage.id] }))}
                    >
                      {stage.title}
                    </button>
                  )}
                  {stage.empty ? null : (
                    <div className="storyStageItems" id={panelId} hidden={!isOpen}>
                      {stage.segments.map((segment) => (
                        <a
                          key={segment.id}
                          href={`#${segment.id}`}
                          aria-current={segment.id === activeId ? "true" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            jump(segment.id);
                          }}
                        >
                          {segment.label}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
