import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About the Archive" };

export default function AboutPage() {
  return (
    <>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">About the Archive</p>
          <h1 className="display">Stories held with care.</h1>
          <p className="lede">Our Way of Life Archive centers life stories and experiences through visual art, oral history, and storytelling.</p>
        </div>
      </section>

      <section className="section">
        <div className="container widePanel twoCol">
          <div>
            <p className="eyebrow">Our Mission</p>
            <h2 className="sectionTitle">Make lived experience visible, searchable, and shareable.</h2>
            <div className="rule" />
            <p className="prose">The archive brings together stories from Latine immigrants, Chinese immigrants, and African American older adults, preserving community knowledge through art and storytelling.</p>
          </div>
          <div className="archiveArt" aria-hidden="true" />
        </div>
      </section>

      <section className="section">
        <div className="container widePanel twoCol reverse">
          <div className="archiveArt" aria-hidden="true" />
          <div>
            <p className="eyebrow">Our Approach</p>
            <h2 className="sectionTitle">Community stories, presented in their own context.</h2>
            <div className="rule" />
            <p className="prose">This page intentionally avoids invented historical details or fictional staff. Research methods and team information can be migrated directly from verified project materials.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container collections">
          <div className="collectionCard">
            <span>Learn more</span><h3>Research Methods</h3><p>Add the project’s verified research methods here.</p>
          </div>
          <div className="collectionCard">
            <span>People</span><h3>Our Team</h3><p>Add verified team bios and roles here.</p>
          </div>
          <div className="collectionCard">
            <span>Archive</span><h3>Explore Stories</h3><p>Move from project context into the story collection.</p><p><Link href="/stories">Browse stories →</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
