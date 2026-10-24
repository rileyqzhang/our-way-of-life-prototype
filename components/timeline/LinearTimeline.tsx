"use client";

import { Fragment, useId } from "react";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";
import type { TimelineBlock, TimelineEvent, TimelineLanguage } from "@/lib/timeline/types";

const copy: Record<TimelineLanguage, { title: string; subtitle: string }> = {
  en: { title: "Our Way of Life", subtitle: "Weaving Our History" },
  es: { title: "Nuestra Forma de Vida", subtitle: "Tejiendo Nuestra Historia" },
  zh: { title: "我们的生活方式", subtitle: "编织我们的历史" },
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
        <RichText value={pick(block.text, lang)} />
      </p>
    );
  }

  if (block.type === "participant") {
    const href = block.slug ? `/${lang}/stories/${block.slug}` : block.href;
    const external = href.startsWith("http");
    const alt = pick(block.imageAlt, lang) || `Portrait of participant ${block.code}`;
    return (
      <h4>
        <a className="itlParticipant" href={href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {block.avatar ? (
            <ArchiveImage alt={alt} className="itlAvatar" height={60} src={block.avatar} width={60} />
          ) : (
            <span className="itlAvatarFallback" aria-hidden="true">
              {block.code.slice(0, 1)}
            </span>
          )}
          <span>{pick(block.title, lang)}</span>
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

  const imageAlt = block.imageAlt || pick(block.title, lang);
  return (
    <a className="itlLink" href={block.href} rel="noopener noreferrer" target="_blank">
      {block.image ? <img alt={imageAlt} src={block.image} /> : null}
      <span className="itlLinkText">
        <span className="itlLinkTitle">{pick(block.title, lang)}</span>
        {pick(block.description, lang) ? <span className="itlLinkDesc">{pick(block.description, lang)}</span> : null}
        {block.domain ? <span className="itlLinkDomain">{block.domain}</span> : null}
      </span>
    </a>
  );
}

function TimelineEntry({ event, lang }: { event: TimelineEvent; lang: TimelineLanguage }) {
  const panelId = useId();
  return (
    <article className="itlEntry" id={event.id}>
      <p className="itlDate">{event.date}</p>
      <details>
        <summary aria-controls={panelId}>
          <h2 className="itlHeading">{pick(event.title, lang)}</h2>
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

export function LinearTimeline({ events, lang }: { events: TimelineEvent[]; lang: Locale }) {
  const text = copy[lang];

  return (
    <section className="timelinePage">
      <div className="timelineCanvas">
        <div className="itlShapes" aria-hidden="true">
          <span className="itlShape ringLg" />
          <span className="itlShape dotSm1" />
          <span className="itlShape ringMd" />
          <span className="itlShape halfL" />
          <span className="itlShape triR" />
          <span className="itlShape dotSm2" />
          <span className="itlShape dotSm3" />
          <span className="itlShape dotSm4" />
          <span className="itlShape diamond" />
          <span className="itlShape halfR" />
          <span className="itlShape ringSm" />
          <span className="itlShape triL" />
          <span className="itlShape dotSm5" />
          <span className="itlShape ringBtm" />
        </div>
        <div className="interactiveTimeline">
          <h1 className="itlTitle">{text.title}</h1>
          <p className="itlSubtitle">{text.subtitle}</p>
          <div className="itlList">
            {events.map((event) => (
              <TimelineEntry event={event} key={event.id} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
