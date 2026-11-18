"use client";

import { useId } from "react";
import { TimelineNarrative } from "@/components/timeline/TimelineNarrative";
import { pick } from "@/lib/content/text";
import type { Locale } from "@/lib/i18n";
import type { StoryRef } from "@/lib/timeline/card-content";
import type { TimelineEvent, TimelineLanguage } from "@/lib/timeline/types";

const copy: Record<TimelineLanguage, { title: string; subtitle: string }> = {
  en: { title: "Our Way of Life", subtitle: "Weaving Our History" },
  es: { title: "Nuestra Forma de Vida", subtitle: "Tejiendo Nuestra Historia" },
  zh: { title: "我们的生活方式", subtitle: "编织我们的历史" },
};

function TimelineEntry({ event, lang, stories }: { event: TimelineEvent; lang: TimelineLanguage; stories: readonly StoryRef[] }) {
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
          <TimelineNarrative event={event} lang={lang} stories={stories} surface="paper" />
        </div>
      </details>
    </article>
  );
}

export function LinearTimeline({ events, lang, stories = [] }: { events: TimelineEvent[]; lang: Locale; stories?: readonly StoryRef[] }) {
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
              <TimelineEntry event={event} key={event.id} lang={lang} stories={stories} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
