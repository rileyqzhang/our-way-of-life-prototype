import Link from "next/link";
import type { PublishedStoryCard as PublishedStory } from "@/types/story";

export function PublishedStoryCard({ story }: { story: PublishedStory }) {
  return (
    <article className="storyCard">
      <div className={`storyCardMedia storyCardMedia--${story.scene}`} role="img" aria-label={story.imageAlt}>
        <span className="storyCardBadge">{story.identifier}</span>
      </div>
      <div className="storyCardBody">
        <p className="storyCardMark" aria-hidden="true">
          “
        </p>
        <blockquote className="storyCardQuote" lang={story.quoteLang}>
          {story.quote}
        </blockquote>
        <div className="storyCardFooter">
          <p className="storyCardLocation">{story.location}</p>
          {story.comingSoon ? (
            <p className="storyCardSoon">Coming soon</p>
          ) : story.href ? (
            <Link className="storyCardLink" href={story.href}>
              Read Story <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
