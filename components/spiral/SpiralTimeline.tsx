"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { SpiralScene } from "@/components/spiral/scene";
import { START_YEAR, TURN_COUNT, YEARS_PER_TURN } from "@/lib/spiral/geometry";
import { readPalette } from "@/lib/spiral/palette";
import type { SpiralCategory, SpiralEvent } from "@/lib/spiral/types";
import type { Locale } from "@/lib/i18n";

const categoryNames: Record<Locale, Record<SpiralCategory, string>> = {
  en: {
    rights: "Civil rights & law",
    migration: "Immigration",
    labor: "Work & labor",
    culture: "Culture & community",
  },
  es: {
    rights: "Derechos civiles y ley",
    migration: "Inmigración",
    labor: "Trabajo",
    culture: "Cultura y comunidad",
  },
  zh: {
    rights: "民权与法律",
    migration: "移民",
    labor: "劳动",
    culture: "文化与社区",
  },
};

const chrome = {
  en: {
    label: "Spiral timeline, 1920 to 2020s",
    all: "All periods",
    show: "Show these 20 years",
    empty: "No stories in this year.",
    emptyDecade: "No stories in these 20 years.",
    choose: "Select a 20-year period to read its stories.",
    prev: "Previous 20 years",
    next: "Next 20 years",
    stories: (count: number) => `${count} ${count === 1 ? "story" : "stories"}`,
    decade: (year: number) => `${year}–${year + YEARS_PER_TURN - 1}`,
    openDecade: (year: number, count: number) => `${year}–${year + YEARS_PER_TURN - 1}, ${count} ${count === 1 ? "story" : "stories"}. Show these 20 years.`,
    openYear: (year: number, title: string) => (title ? `${year}. ${title}` : `${year}. No stories`),
  },
  es: {
    label: "Línea de tiempo en espiral, de 1920 a los años 2020",
    all: "Todos los períodos",
    show: "Ver estos 20 años",
    empty: "No hay historias en este año.",
    emptyDecade: "No hay historias en estos 20 años.",
    choose: "Elige un período de 20 años para leer sus historias.",
    prev: "20 años anteriores",
    next: "20 años siguientes",
    stories: (count: number) => `${count} ${count === 1 ? "historia" : "historias"}`,
    decade: (year: number) => `${year}–${year + YEARS_PER_TURN - 1}`,
    openDecade: (year: number, count: number) => `${year}–${year + YEARS_PER_TURN - 1}, ${count} ${count === 1 ? "historia" : "historias"}. Mostrar estos 20 años.`,
    openYear: (year: number, title: string) => (title ? `${year}. ${title}` : `${year}. Sin historias`),
  },
  zh: {
    label: "螺旋时间线，1920 年至 2020 年代",
    all: "全部时期",
    show: "显示这二十年",
    empty: "这一年没有故事。",
    emptyDecade: "这二十年没有故事。",
    choose: "选择一个二十年，阅读其中的故事。",
    prev: "前二十年",
    next: "后二十年",
    stories: (count: number) => `${count} 则故事`,
    decade: (year: number) => `${year}–${year + YEARS_PER_TURN - 1}`,
    openDecade: (year: number, count: number) => `${year}–${year + YEARS_PER_TURN - 1}，${count} 则故事。进入这二十年。`,
    openYear: (year: number, title: string) => (title ? `${year}。${title}` : `${year}。没有故事`),
  },
} as const;

function eventsInDecade(events: SpiralEvent[], decade: number) {
  const start = START_YEAR + decade * YEARS_PER_TURN;
  return events.filter((event) => event.year >= start && event.year < start + YEARS_PER_TURN);
}

export function SpiralTimeline({ events, lang }: { events: SpiralEvent[]; lang: Locale }) {
  const copy = chrome[lang];
  const names = categoryNames[lang];
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const decadeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const yearRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneRef = useRef<SpiralScene | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"overview" | "decade">("overview");
  const [decade, setDecade] = useState(0);
  const [year, setYear] = useState<number | null>(null);
  const [labelHover, setLabelHover] = useState<number | null>(null);
  const [buttonHover, setButtonHover] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const headingId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const scene = new SpiralScene(canvas, events, readPalette(stage));
    sceneRef.current = scene;
    scene.onSelectDecade = (next) => {
      setMode("decade");
      setDecade(next);
      setYear(null);
      requestAnimationFrame(() => backRef.current?.focus());
    };
    scene.onSelectYear = (next) => {
      setYear((current) => (current === next ? null : next));
    };
    scene.onChangeDecade = (direction) => {
      setDecade((current) => Math.max(0, Math.min(TURN_COUNT - 1, current + direction)));
      setYear(null);
    };
    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [events]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.view.mode = mode;
    scene.view.decade = decade;
    scene.view.year = year;
    scene.view.labelHoverDecade = labelHover;
    scene.view.buttonHoverYear = buttonHover;
    scene.view.reducedMotion = reduced;
    scene.setElements({
      decades: decadeRefs.current,
      years: yearRefs.current,
      tooltip: tooltipRef.current,
      panel: panelRef.current,
    });
  }, [mode, decade, year, labelHover, buttonHover, reduced]);

  const decadeYear = START_YEAR + decade * YEARS_PER_TURN;
  const shownDecade = mode === "decade" ? decade : labelHover;
  const activeList = shownDecade == null ? [] : eventsInDecade(events, shownDecade);
  const visibleList = year == null ? activeList : activeList.filter((event) => event.year === year);
  const rangeTitle = lang === "zh" ? "1920–2020 年代" : lang === "es" ? "1920–2020" : "1920s–2020s";
  const title = year != null ? String(year) : shownDecade == null ? rangeTitle : copy.decade(START_YEAR + shownDecade * 10);

  function chooseDecade(index: number) {
    setMode("decade");
    setDecade(index);
    setYear(null);
    requestAnimationFrame(() => backRef.current?.focus());
  }

  function changeDecade(direction: 1 | -1) {
    setDecade((current) => Math.max(0, Math.min(TURN_COUNT - 1, current + direction)));
    setYear(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && mode === "decade") {
      event.preventDefault();
      setMode("overview");
      setYear(null);
      return;
    }
    if (mode !== "decade") return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      changeDecade(1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      changeDecade(-1);
    }
  }

  return (
    <section
      ref={stageRef}
      className="spiralStage"
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
    >
      <h2 id={headingId} className="visuallyHidden">
        {copy.label}
      </h2>
      <canvas ref={canvasRef} className="spiralCanvas" aria-hidden="true" />
      <div className="spiralLabels">
        {Array.from({ length: TURN_COUNT }, (_, index) => {
          const start = START_YEAR + index * YEARS_PER_TURN;
          const count = eventsInDecade(events, index).length;
          return (
            <button
              key={start}
              ref={(element) => {
                decadeRefs.current[index] = element;
              }}
              type="button"
              className="spiralDecade"
              aria-label={copy.openDecade(start, count)}
              onMouseEnter={() => setLabelHover(index)}
              onMouseLeave={() => setLabelHover(null)}
              onFocus={() => setLabelHover(index)}
              onBlur={() => setLabelHover(null)}
              onClick={() => chooseDecade(index)}
            >
              {copy.decade(start)} · {copy.stories(count)}
            </button>
          );
        })}
        {Array.from({ length: YEARS_PER_TURN }, (_, index) => {
          const stepYear = decadeYear + index;
          const stepEvents = events.filter((event) => event.year === stepYear);
          return (
            <button
              key={index}
              ref={(element) => {
                yearRefs.current[index] = element;
              }}
              type="button"
              className={year === stepYear ? "spiralYear isSelected" : "spiralYear"}
              hidden={stepEvents.length === 0}
              aria-pressed={year === stepYear}
              aria-label={copy.openYear(stepYear, stepEvents[0]?.title ?? "")}
              onMouseEnter={() => setButtonHover(stepYear)}
              onMouseLeave={() => setButtonHover(null)}
              onFocus={() => setButtonHover(stepYear)}
              onBlur={() => setButtonHover(null)}
              onClick={() => setYear((current) => (current === stepYear ? null : stepYear))}
            >
              <span>{stepYear}</span>
              {stepEvents.length > 0 ? (
                <span className="spiralDots">
                  {stepEvents.map((event, eventIndex) => (
                    <i key={`${event.title}-${eventIndex}`} className={`spiralDot spiralDot--${event.category}`} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div ref={tooltipRef} className="spiralTooltip" hidden>
        <p data-spiral-tip-year />
        <p data-spiral-tip-title />
      </div>
      {mode === "decade" ? (
        <button
          ref={backRef}
          type="button"
          className="spiralBack"
          onClick={() => {
            setMode("overview");
            setYear(null);
          }}
        >
          ← {copy.all}
        </button>
      ) : null}
      <aside ref={panelRef} className="spiralPanel">
        <p className="eyebrow">{mode === "decade" ? copy.decade(decadeYear) : copy.label}</p>
        <h3 className="spiralPanelTitle">{title}</h3>
        <p className="spiralCount">{copy.stories(visibleList.length)}</p>
        {visibleList.length === 0 ? (
          <p className="spiralEmpty">{year == null ? (mode === "overview" && labelHover == null ? copy.choose : copy.emptyDecade) : copy.empty}</p>
        ) : (
          <ul className="spiralEvents">
            {visibleList.map((event) => (
              <li key={`${event.year}-${event.title}`}>
                <article>
                  <p className="spiralMeta">
                    <i className={`spiralDot spiralDot--${event.category}`} aria-hidden="true" />
                    <span>{event.year}</span>
                    <span>{names[event.category]}</span>
                  </p>
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                  {event.image ? <img src={event.image} alt={event.title} /> : null}
                </article>
              </li>
            ))}
          </ul>
        )}
        {mode === "decade" && year != null ? (
          <button type="button" className="spiralReset" onClick={() => setYear(null)}>
            {copy.show}
          </button>
        ) : null}
      </aside>
      {mode === "decade" ? (
        <div className="spiralPager">
          <button type="button" onClick={() => changeDecade(-1)} disabled={decade === 0}>
            {copy.prev}
          </button>
          <span>{copy.decade(decadeYear)}</span>
          <button type="button" onClick={() => changeDecade(1)} disabled={decade === TURN_COUNT - 1}>
            {copy.next}
          </button>
        </div>
      ) : null}
    </section>
  );
}
