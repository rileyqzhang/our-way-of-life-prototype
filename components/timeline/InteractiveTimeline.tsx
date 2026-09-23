"use client";

import { Fragment, useId, useState } from "react";
import type { TimelineBlock, TimelineEvent, TimelineLanguage } from "@/lib/timeline/types";

const languages: { id: TimelineLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "zh", label: "中文" },
];

const copy: Record<TimelineLanguage, { title: string; subtitle: string; hint: string }> = {
  en: {
    title: "Our Way of Life",
    subtitle: "Weaving Our History",
    hint: "Click to translate timeline",
  },
  es: {
    title: "Nuestra Forma de Vida",
    subtitle: "Tejiendo Nuestra Historia",
    hint: "Haga clic para traducir la línea de tiempo",
  },
  zh: {
    title: "我们的生活方式",
    subtitle: "编织我们的历史",
    hint: "点击翻译时间轴",
  },
};

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

function BlockView({ block, lang }: { block: TimelineBlock; lang: TimelineLanguage }) {
  if (block.type === "paragraph") {
    return (
      <p className={block.emphasis === "caption" ? "itlCaption" : undefined}>
        <RichText value={block.text[lang]} />
      </p>
    );
  }

  if (block.type === "participant") {
    return (
      <h4>
        <a className="itlParticipant" href={block.href} rel="noopener noreferrer" target="_blank">
          {block.avatar ? (
            <img alt="" className="itlAvatar" src={block.avatar} />
          ) : (
            <span className="itlAvatarFallback" aria-hidden="true">
              {block.code.slice(0, 1)}
            </span>
          )}
          <span>{block.title[lang]}</span>
        </a>
      </h4>
    );
  }

  if (block.type === "video") {
    const src = youtubeEmbed(block.src);
    if (!src) return null;
    return (
      <div className="itlVideo">
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
    <a className="itlLink" href={block.href} rel="noopener noreferrer" target="_blank">
      {block.image ? <img alt={block.imageAlt || ""} src={block.image} /> : null}
      <span className="itlLinkText">
        <span className="itlLinkTitle">{block.title[lang]}</span>
        {block.description[lang] ? <span className="itlLinkDesc">{block.description[lang]}</span> : null}
        {block.domain ? <span className="itlLinkDomain">{block.domain}</span> : null}
      </span>
    </a>
  );
}

function TimelineEntry({ event, lang }: { event: TimelineEvent; lang: TimelineLanguage }) {
  const panelId = useId();
  return (
    <article className="itlEntry">
      <p className="itlDate">{event.date}</p>
      <details>
        <summary aria-controls={panelId}>
          <h2 className="itlHeading">{event.title[lang]}</h2>
          <span className="itlChevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </summary>
        <div className="itlCard" id={panelId}>
          {event.blocks.map((block, index) => (
            <BlockView block={block} key={`${event.id}-${index}`} lang={lang} />
          ))}
        </div>
      </details>
    </article>
  );
}

export function InteractiveTimeline({ events }: { events: TimelineEvent[] }) {
  const labelId = useId();
  const [lang, setLang] = useState<TimelineLanguage>("en");
  const text = copy[lang];

  function moveSelection(current: TimelineLanguage, direction: 1 | -1) {
    const index = languages.findIndex((language) => language.id === current);
    const next = languages[(index + direction + languages.length) % languages.length];
    setLang(next.id);
    document.getElementById(`timeline-language-${next.id}`)?.focus();
  }

  return (
    <div className="interactiveTimeline">
      <div className="itlLang">
          <p id={labelId} className="itlLangHint">
            {text.hint}
          </p>
          <div className="itlLangButtons" role="radiogroup" aria-labelledby={labelId}>
            {languages.map((language) => {
              const selected = language.id === lang;
              return (
                <button
                  key={language.id}
                  type="button"
                  role="radio"
                  id={`timeline-language-${language.id}`}
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  className={selected ? "isSelected" : undefined}
                  onClick={() => setLang(language.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                      event.preventDefault();
                      moveSelection(language.id, 1);
                    }
                    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                      event.preventDefault();
                      moveSelection(language.id, -1);
                    }
                  }}
                >
                  {language.label}
                </button>
              );
            })}
          </div>
      </div>
      <h1 className="itlTitle">{text.title}</h1>
      <p className="itlSubtitle">{text.subtitle}</p>

      <div className="itlList">
        {events.map((event) => (
          <TimelineEntry event={event} key={event.id} lang={lang} />
        ))}
      </div>
    </div>
  );
}
