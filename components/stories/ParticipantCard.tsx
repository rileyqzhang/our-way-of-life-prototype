import Link from "next/link";
import { ArchiveImage } from "@/components/media/ArchiveImage";
import type { ArchiveStory } from "@/lib/content/derive";
import { openingQuotation, pick } from "@/lib/content/text";
import { localizeHref, type Locale } from "@/lib/i18n";

function stripQuotes(text: string) {
  return text.trim().replace(/^["“«]+|["”»]+$/g, "").trim();
}

export function ParticipantCard({ story, lang, readStory }: { story: ArchiveStory; lang: Locale; readStory: string }) {
  const photo = story.photographs[0];
  const storedQuote = pick(story.quotations[0]?.text, lang);
  const quote = stripQuotes(storedQuote || openingQuotation(story.body, lang));
  const location = pick(story.location, lang);

  return (
    <article className={photo ? "storyCard" : "storyCard storyCard--text"}>
      {photo ? (
        <div className="storyCardMedia">
          <ArchiveImage alt={pick(photo.alt, lang)} className="storyCardPhoto" height={440} src={photo.src} width={640} />
          <span className="storyCardBadge">{story.participantCode}</span>
        </div>
      ) : (
        <div className="storyCardIdentity">
          <span className="storyCardBadge">{story.participantCode}</span>
        </div>
      )}
      <div className="storyCardBody">
        {quote ? (
          <p className="storyCardMark" aria-hidden="true">
            “
          </p>
        ) : null}
        {quote ? <blockquote className="storyCardQuote">{quote}</blockquote> : null}
        <div className="storyCardFooter">
          {location ? <p className="storyCardLocation">{location}</p> : <span />}
          <Link className="storyCardLink" href={localizeHref(lang, `/stories/${story.slug}`)}>
            {readStory} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
