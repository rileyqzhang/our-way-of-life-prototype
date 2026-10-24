"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { LinearTimeline } from "@/components/timeline/LinearTimeline";
import { VortexCanvas, type VortexPoint } from "@/components/timeline/VortexCanvas";
import { scrollProgressFor, toVortexNodes, type VortexNode } from "@/components/timeline/vortex-model";
import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";
import type { TimelineBlock, TimelineEvent } from "@/lib/timeline/types";

const chrome = {
  en: {
    archive: "Our Way of Life Archive",
    viewLabel: "Timeline view",
    vortex: "Vortex timeline",
    linear: "Linear timeline",
    scroll: "Scroll to traverse decades",
    read: "Read story",
    close: "Close",
    closePreview: "Close preview",
    oral: "Oral archive",
    stories: "Timeline stories",
  },
  es: {
    archive: "Archivo Our Way of Life",
    viewLabel: "Vista de la línea de tiempo",
    vortex: "Línea en vórtice",
    linear: "Línea lineal",
    scroll: "Desplázate para recorrer las décadas",
    read: "Leer la historia",
    close: "Cerrar",
    closePreview: "Cerrar vista previa",
    oral: "Archivo oral",
    stories: "Historias de la línea de tiempo",
  },
  zh: {
    archive: "我们的生活方式档案",
    viewLabel: "时间线视图",
    vortex: "漩涡时间线",
    linear: "线性时间线",
    scroll: "滚动穿越年代",
    read: "阅读故事",
    close: "关闭",
    closePreview: "关闭预览",
    oral: "口述档案",
    stories: "时间线故事",
  },
} as const;

const richToken = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function RichText({ value }: { value: string }) {
  return value.split("\n").map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {lineIndex > 0 ? <br /> : null}
      {line.split(richToken).map((part, partIndex) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
          return (
            <a key={partIndex} href={link[2]} rel="noopener noreferrer" target="_blank">
              {link[1]}
            </a>
          );
        }
        return <Fragment key={partIndex}>{part}</Fragment>;
      })}
    </Fragment>
  ));
}

function youtubeEmbed(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol === "https:" && url.hostname === "www.youtube.com" && url.pathname.startsWith("/embed/")) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function InteractiveTimeline({ events, lang }: { events: TimelineEvent[]; lang: Locale }) {
  const copy = chrome[lang];
  const nodes = useMemo(() => toVortexNodes(events, lang), [events, lang]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [point, setPoint] = useState<VortexPoint | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [view, setView] = useState<"vortex" | "linear">("vortex");
  const [diving, setDiving] = useState(false);
  const overCard = useRef(false);
  const pinnedRef = useRef<string | null>(null);
  const clearTimer = useRef<number | null>(null);
  const progressRef = useRef(0);
  const diveFrame = useRef<number | null>(null);
  const labelId = useId();
  pinnedRef.current = pinnedId;
  if (!diveFrame.current) progressRef.current = scrollProgress;

  const hovered = nodes.find((node) => node.id === hoveredId) ?? null;
  const reading = nodes.find((node) => node.id === readingId) ?? null;
  const readingEvent = events.find((event) => event.id === readingId) ?? null;

  const readingRef = useRef<string | null>(null);
  readingRef.current = readingId;

  const stopDive = () => {
    if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    diveFrame.current = null;
    setDiving(false);
  };

  const animateTo = (target: number, onDone?: () => void) => {
    if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    const start = progressRef.current;
    const from = performance.now();
    const duration = Math.min(1500, Math.max(720, Math.abs(target - start) * 1600));
    setDiving(true);
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
      setDiving(false);
      onDone?.();
    };
    diveFrame.current = requestAnimationFrame(tick);
  };

  const diveTo = (node: VortexNode) => {
    setHoveredId(node.id);
    setPinnedId(node.id);
    animateTo(scrollProgressFor(node.spiralParam), () => setReadingId(node.id));
  };

  const openedHash = useRef(false);
  useEffect(() => {
    if (openedHash.current) return;
    const id = window.location.hash.replace("#", "");
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    openedHash.current = true;
    diveTo(node);
  }, [nodes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
      diveFrame.current = null;
      setDiving(false);
      if (readingRef.current) {
        setReadingId(null);
        return;
      }
      setPinnedId(null);
      setHoveredId(null);
      setPoint(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    };
  }, []);

  const scrollBy = (delta: number) => {
    if (readingRef.current) return;
    if (diveFrame.current) cancelAnimationFrame(diveFrame.current);
    diveFrame.current = null;
    setDiving(false);
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
        <LinearTimeline events={events} lang={lang} />
      ) : (
    <section className="vortexStage" aria-labelledby={labelId}>
      <h1 id={labelId} className="visuallyHidden">
        {copy.archive}
      </h1>

      <VortexCanvas
        nodes={nodes}
        hoveredId={hoveredId}
        pinned={Boolean(pinnedId)}
        scrollProgress={scrollProgress}
        onHover={(id) => {
          if (clearTimer.current) window.clearTimeout(clearTimer.current);
          if (id) {
            setHoveredId(id);
            return;
          }
          clearTimer.current = window.setTimeout(() => {
            if (overCard.current || pinnedRef.current) return;
            setHoveredId(null);
            setPoint(null);
          }, 180);
        }}
        onPin={(id) => {
          if (!id) {
            stopDive();
            setPinnedId(null);
            setHoveredId(null);
            setPoint(null);
            return;
          }
          const node = nodes.find((item) => item.id === id);
          if (node) diveTo(node);
        }}
        onScrollDelta={scrollBy}
        onHoveredPoint={setPoint}
      />

      {hovered && point?.visible && !diving ? (
        <VortexPopover
          node={hovered}
          point={point}
          readLabel={copy.read}
          closeLabel={copy.closePreview}
          oralLabel={copy.oral}
          onRead={() => diveTo(hovered)}
          onClose={() => {
            overCard.current = false;
            setPinnedId(null);
            setHoveredId(null);
            setPoint(null);
          }}
          onMouseEnter={() => {
            overCard.current = true;
          }}
          onMouseLeave={() => {
            overCard.current = false;
            if (pinnedId) return;
            setHoveredId(null);
            setPoint(null);
          }}
        />
      ) : null}

      <button
        type="button"
        className="vortexScroll"
        onClick={() => animateTo(progressRef.current >= 0.85 ? 0 : Math.min(1.05, progressRef.current + 0.18))}
      >
        {copy.scroll} {scrollProgress >= 0.85 ? "↑" : "↓"}
      </button>

      {reading && readingEvent ? (
        <NarrativeModal
          node={reading}
          event={readingEvent}
          nodes={nodes}
          lang={lang}
          closeLabel={copy.close}
          onClose={() => setReadingId(null)}
          onSelect={(node) => diveTo(node)}
        />
      ) : null}

      <div className="visuallyHidden">
        <h2>{copy.stories}</h2>
        <ul>
          {nodes.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => diveTo(node)}>
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

function VortexPopover({
  node,
  point,
  readLabel,
  closeLabel,
  oralLabel,
  onRead,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  node: VortexNode;
  point: VortexPoint;
  readLabel: string;
  closeLabel: string;
  oralLabel: string;
  onRead: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState({ x: 24, y: 80, width: 335, height: 320 });
  const multiple = node.quotes.filter((quote) => quote.quote).length > 1;

  useEffect(() => {
    const card = cardRef.current;
    const width = Math.min(335, window.innerWidth - 32);
    const height = card?.offsetHeight || 320;
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.5;
    const exclusion = 150;
    const dx = point.x - centerX;
    let x = dx >= 0 ? Math.max(point.x + 32, centerX + exclusion) : Math.min(point.x - width - 32, centerX - exclusion - width);
    if (dx >= 0 && x + width > window.innerWidth - 16) x = Math.max(16, point.x - width - 28);
    if (dx < 0 && x < 16) x = Math.min(window.innerWidth - width - 16, point.x + 28);
    let y = point.y - height * 0.42;
    if (Math.abs(x + width / 2 - centerX) < exclusion) {
      y = point.y >= centerY ? Math.max(y, centerY + exclusion * 0.7) : Math.min(y, centerY - exclusion * 0.7 - height);
    }
    y = Math.max(72, Math.min(window.innerHeight - height - 56, y));
    x = Math.max(16, Math.min(window.innerWidth - width - 16, x));
    setBox({ x, y, width, height });
  }, [node.id, point.x, point.y, multiple]);

  const anchorX = point.x < box.x ? box.x : box.x + box.width;
  const anchorY = Math.max(box.y + 24, Math.min(box.y + box.height - 24, point.y));

  return (
    <>
      <svg className="vortexLeader" aria-hidden="true">
        <line x1={point.x} y1={point.y} x2={anchorX} y2={anchorY} />
        <circle cx={anchorX} cy={anchorY} r="2" />
      </svg>
      <aside
        ref={cardRef}
        className="vortexCard"
        style={{ left: box.x, top: box.y, width: box.width }}
        aria-label={`${node.date}. ${node.headline}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <button type="button" className="vortexCardClose" onClick={onClose} aria-label={closeLabel}>
          ×
        </button>
        {node.photoUrl ? (
          <div className="vortexCardPhoto">
            <img src={node.photoUrl} alt={node.photoAlt} />
          </div>
        ) : null}
        <div className="vortexCardBody">
          <p className="vortexEra">
            {node.date} · {node.headline}
          </p>
          {multiple ? (
            <div className="vortexQuotes">
              {node.quotes
                .filter((quote) => quote.quote)
                .slice(0, 2)
                .map((quote) => (
                  <div key={quote.code}>
                    <p className="vortexQuoteTag">{quote.tag}</p>
                    <p className="vortexQuote">“{quote.quote.length > 160 ? `${quote.quote.slice(0, 160).trimEnd()}…` : quote.quote}”</p>
                  </div>
                ))}
            </div>
          ) : (
            <>
              <h2 className="vortexHeadline">{node.headline}</h2>
              <blockquote className="vortexQuote">{node.excerpt}</blockquote>
            </>
          )}
          <div className="vortexCardFoot">
            <button type="button" onClick={onRead}>
              {readLabel} <span aria-hidden="true">→</span>
            </button>
            <span>{oralLabel}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function NarrativeModal({
  node,
  event,
  nodes,
  lang,
  closeLabel,
  onClose,
  onSelect,
}: {
  node: VortexNode;
  event: TimelineEvent;
  nodes: VortexNode[];
  lang: Locale;
  closeLabel: string;
  onClose: () => void;
  onSelect: (node: VortexNode) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const index = nodes.findIndex((item) => item.id === node.id);
  const prev = index > 0 ? nodes[index - 1] : null;
  const next = index >= 0 && index < nodes.length - 1 ? nodes[index + 1] : null;
  const titleId = useId();

  useEffect(() => {
    closeRef.current?.focus();
  }, [node.id]);

  return (
    <div className="vortexModal" role="presentation">
      <button type="button" className="vortexModalBackdrop" aria-label={closeLabel} onClick={onClose} />
      <article className="vortexModalPanel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="vortexModalBar">
          <p className="vortexEra">
            {node.date} · {node.headline}
          </p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </div>
        <h2 id={titleId}>{node.headline}</h2>
        {node.photoUrl ? (
          <figure>
            <img src={node.photoUrl} alt={node.photoAlt} />
          </figure>
        ) : null}
        <div className="vortexModalBody">
          {event.blocks.map((block, blockIndex) => (
            <BlockView block={block} key={`${event.id}-${blockIndex}`} lang={lang} />
          ))}
        </div>
        <div className="vortexModalNav">
          {prev ? (
            <button type="button" onClick={() => onSelect(prev)}>
              ← {prev.date}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose}>
            {closeLabel}
          </button>
          {next ? (
            <button type="button" onClick={() => onSelect(next)}>
              {next.date} →
            </button>
          ) : (
            <span />
          )}
        </div>
      </article>
    </div>
  );
}

function BlockView({ block, lang }: { block: TimelineBlock; lang: Locale }) {
  if (block.type === "paragraph") {
    return (
      <p className={block.emphasis === "caption" ? "vortexCaption" : undefined}>
        <RichText value={pick(block.text, lang)} />
      </p>
    );
  }

  if (block.type === "participant") {
    const href = block.slug ? `/${lang}/stories/${block.slug}` : block.href;
    const external = href.startsWith("http");
    const alt = pick(block.imageAlt, lang) || `Portrait of participant ${block.code}`;
    return (
      <a className="vortexPerson" href={href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
        {block.avatar ? <img alt={alt} src={block.avatar} /> : <span aria-hidden="true">{block.code.slice(0, 1)}</span>}
        <span>{pick(block.title, lang)}</span>
      </a>
    );
  }

  if (block.type === "video") {
    const src = youtubeEmbed(block.src);
    if (!src) return null;
    return (
      <div className="vortexVideo">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          src={src}
          title={block.title}
        />
      </div>
    );
  }

  return (
    <a className="vortexLink" href={block.href} rel="noopener noreferrer" target="_blank">
      {block.image ? <img alt={block.imageAlt || pick(block.title, lang)} src={block.image} /> : null}
      <span>
        <strong>{pick(block.title, lang)}</strong>
        {pick(block.description, lang) ? <em>{pick(block.description, lang)}</em> : null}
        {block.domain ? <small>{block.domain}</small> : null}
      </span>
    </a>
  );
}
