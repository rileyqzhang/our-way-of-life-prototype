import type { Metadata } from "next";
import { LanguageSelector } from "@/components/share-your-story/LanguageSelector";
import { PublishedStoryCard } from "@/components/share-your-story/PublishedStoryCard";
import { StorySubmissionForm } from "@/components/share-your-story/StorySubmissionForm";
import { publishedStories } from "@/lib/stories/published-stories";

export const metadata: Metadata = { title: "Share Your Story" };

export default function ShareYourStoryPage() {
  return (
    <div className="archivePage">
      <section className="archiveHero">
        <div className="container archiveHeroInner">
          <div className="archiveHeroCopy">
            <h1 className="archiveTitle">Share Your Story</h1>
            <p className="archiveLede">
              You are invited to contribute to this study of civic participation. Take a moment to think
              about the people who shaped you and the moments that stand out. To be added to this
              website’s participant list, fill out the questionnaire and include your email address so
              we can request your approval before publication.
            </p>
            <LanguageSelector />
          </div>
        </div>
      </section>
      <div className="goldBar" aria-hidden="true" />

      <section className="storyCardsBand" aria-labelledby="stories-published-heading">
        <div className="container">
          <p className="storyCardsEyebrow">Story cards — Participants</p>
          <h2 id="stories-published-heading" className="storyCardsTitle">
            Their Words. Their Lives.
          </h2>
          <div className="storyCardGrid">
            {publishedStories.map((story) => (
              <PublishedStoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>

      <section className="paperBand" aria-labelledby="share-story-heading">
        <div className="container storyFormPanel">
          <p className="eyebrow">Contribute</p>
          <h2 id="share-story-heading" className="sectionTitle">Share your story</h2>
          <div className="rule" />
          <p className="prose">
            Use the form to send a written story, and optionally a photo, artwork, or short audio file.
            Submitting a story does not automatically publish it. The research team will review the
            submission and contact the participant for approval before publication.
          </p>
          <StorySubmissionForm />
        </div>
      </section>
    </div>
  );
}
