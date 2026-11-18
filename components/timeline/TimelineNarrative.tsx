"use client";

import { Fragment } from "react";
import { cardContent, formatQuote, type CardContent, type StoryRef } from "@/lib/timeline/card-content";
import type { Locale } from "@/lib/i18n";
import type { TimelineEvent } from "@/lib/timeline/types";

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
            <a key={partIndex} href={link[2]}>
              {link[1]}
            </a>
          );
        }
        return <Fragment key={partIndex}>{part}</Fragment>;
      })}
    </Fragment>
  ));
}

const readLabel = {
  en: (code: string) => `Read ${code}'s full story`,
  es: (code: string) => `Leer la historia completa de ${code}`,
  zh: (code: string) => `\u9605\u8bfb ${code} \u7684\u5b8c\u6574\u6545\u4e8b`,
} as const;

export function TimelineNarrative({
  event,
  lang,
  stories = [],
  surface = "dark",
}: {
  event: TimelineEvent;
  lang: Locale;
  stories?: readonly StoryRef[];
  surface?: "dark" | "paper";
}) {
  const card = cardContent(event, lang, stories);
  return (
    <div className={surface === "paper" ? "spiralNarrative isPaper" : "spiralNarrative"}>
      <NarrativeBody card={card} lang={lang} />
    </div>
  );
}

function NarrativeBody({ card, lang }: { card: CardContent; lang: Locale }) {
  return (
    <>
      {card.hero ? <blockquote className="spiralHero">{formatQuote(card.hero)}</blockquote> : null}

      <p className="spiralKicker">{card.kicker}</p>

      {card.eventIntro.map((paragraph) => (
        <p className="spiralProse" key={paragraph}>
          <RichText value={paragraph} />
        </p>
      ))}

      {card.media.map((item) =>
        item.kind === "video" ? (
          <div className="spiralVideo" key={item.src}>
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={item.src}
              title={item.title}
            />
          </div>
        ) : (
          <figure className="spiralPhoto" key={item.src}>
            <img alt={item.alt} src={item.src} />
          </figure>
        ),
      )}

      {card.captions.map((caption) => (
        <p className="spiralCaption" key={caption}>
          <RichText value={caption} />
        </p>
      ))}

      {card.links.map((link) => (
        <a className="spiralReference" href={link.href} key={link.href} rel="noopener noreferrer" target="_blank">
          {link.title}
        </a>
      ))}

      {card.stories.map((story, index) => (
        <section className="spiralStory" key={`${story.code}-${index}`}>
          <p className="spiralSpeaker">{story.code}</p>
          {story.quote ? <blockquote className="spiralStoryQuote">{formatQuote(story.quote)}</blockquote> : null}
          {story.body.map((paragraph) => (
            <p className="spiralProse" key={paragraph}>
              <RichText value={paragraph} />
            </p>
          ))}
          {story.href ? (
            <a className="spiralStoryLink" href={story.href}>
              <span>{readLabel[lang](story.code)}</span>
              <span aria-hidden="true">{"\u2192"}</span>
            </a>
          ) : null}
        </section>
      ))}

      {card.elderAdvice ? (
        <aside className="spiralElder">
          <p>{card.elderAdvice.title}</p>
          <blockquote>{card.elderAdvice.body}</blockquote>
        </aside>
      ) : null}
    </>
  );
}
