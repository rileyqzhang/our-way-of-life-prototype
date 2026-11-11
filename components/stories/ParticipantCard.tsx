import Link from "next/link";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import { PortraitPlaceholder } from "@/components/PortraitPlaceholder";
import type { ArchiveStory } from "@/lib/content/derive";
import { openingQuotation, pick } from "@/lib/content/text";
import { omitElicitationPlain } from "@/lib/content/story-segments";
import { localizeHref, type Locale } from "@/lib/i18n";

function stripQuotes(text: string) {
  return text.trim().replace(/^["“«]+|["”»]+$/g, "").trim();
}

export function ParticipantCard({
  story,
  lang,
  readStory,
  comingSoon,
}: {
  story: ArchiveStory;
  lang: Locale;
  readStory: string;
  comingSoon: string;
}) {
  const photo = story.photographs[0];
  const headline = stripQuotes(pick(story.headline, lang));
  const overviewLead = pick(story.overview, lang)
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const legacyQuote = openingQuotation(
    story.body
      ? {
          en: omitElicitationPlain(story.body.en || ""),
          es: omitElicitationPlain(story.body.es || ""),
          zh: omitElicitationPlain(story.body.zh || ""),
        }
      : undefined,
    lang,
  );
  const quote = headline || overviewLead || stripQuotes(legacyQuote);
  const location = pick(story.location, lang);
  const hasStory = story.hasSegments === true;
  const body = (
    <>
      <div className="participantCardMedia">
        {photo ? (
          <ArchiveImage alt={pick(photo.alt, lang)} className="participantCardPhoto" height={448} src={photo.src} width={640} />
        ) : (
          <PortraitPlaceholder code={story.participantCode} />
        )}
        <div className="participantCardShade" />
        <span className="participantCardCode">{story.participantCode}</span>
      </div>
      <div className="participantCardBody">
        <div>
          {quote ? (
            <span className="participantCardMark" aria-hidden="true">
              "
            </span>
          ) : null}
          {quote ? (
            <p className="participantCardQuote" lang={lang}>
              {quote}
            </p>
          ) : null}
        </div>
        <div className="participantCardFoot">
          <span className="participantCardLocation">{location}</span>
          {hasStory ? (
            <span className="participantCardRead">
              {readStory} <span aria-hidden="true">→</span>
            </span>
          ) : (
            <span className="participantCardSoon">{comingSoon}</span>
          )}
        </div>
      </div>
    </>
  );

  if (!hasStory) return <article className="participantCard">{body}</article>;

  return (
    <Link className="participantCard" href={localizeHref(lang, `/stories/${story.slug}`)}>
      {body}
    </Link>
  );
}
