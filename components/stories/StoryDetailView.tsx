"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ui } from "@/lib/content/copy";
import type { StoryChapterModel, StoryLayoutModel, StorySpan } from "@/lib/content/story-layout";
import { localizeHref, type Locale } from "@/lib/i18n";

function Arrow({ direction, size }: { direction: "left" | "right"; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={direction === "left" ? "M19 12H5M12 5l-7 7 7 7" : "M5 12h14M12 5l7 7-7 7"} />
    </svg>
  );
}

function RichText({ spans }: { spans: StorySpan[] }) {
  return spans.map((span, index) => {
    let node: ReactNode = span.text;
    if (span.href) {
      node = (
        <a href={span.href} rel="noopener noreferrer" target="_blank">
          {node}
        </a>
      );
    }
    if (span.em) node = <em>{node}</em>;
    if (span.strong) node = <strong>{node}</strong>;
    return <span key={index}>{node}</span>;
  });
}

function FadeIn({ children, className, distance, duration, threshold }: { children: ReactNode; className?: string; distance: number; duration: number; threshold: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity ${duration}s ease, transform ${duration}s ease`,
      }}
    >
      {children}
    </div>
  );
}

function ChapterCard({ chapter }: { chapter: StoryChapterModel }) {
  return (
    <FadeIn className="storyChapterFade" distance={32} duration={0.7} threshold={0.06}>
      <article className="storyCardChapter" id={chapter.id}>
        <div className="storyCardHead">
          <p>{chapter.tag}</p>
        </div>
        <div className="storyCardBody">
          {chapter.quote ? (
            <blockquote className="storyCardQuote">
              <span aria-hidden="true">“</span>
              {chapter.quote}
            </blockquote>
          ) : null}
          {chapter.quote && chapter.sections.length ? <div className="storyCardRule" /> : null}
          {chapter.sections.map((section, sectionIndex) => (
            <div className="storyCardSection" key={sectionIndex}>
              {section.paragraphs.map((paragraph, paragraphIndex) =>
                paragraph.kind === "h3" ? (
                  <h3 key={paragraphIndex}>
                    <RichText spans={paragraph.spans} />
                  </h3>
                ) : (
                  <p key={paragraphIndex}>
                    <RichText spans={paragraph.spans} />
                  </p>
                ),
              )}
            </div>
          ))}
        </div>
      </article>
    </FadeIn>
  );
}

export function StoryDetailView({
  lang,
  image,
  layout,
  collectionHref,
  collectionLabel,
  nextHref,
  externalHref,
  fontClassName,
}: {
  lang: Locale;
  image?: { src: string; alt: string };
  layout: StoryLayoutModel;
  collectionHref?: string;
  collectionLabel?: string;
  nextHref?: string;
  externalHref?: string;
  fontClassName: string;
}) {
  const copy = ui[lang];
  const [active, setActive] = useState(0);
  const participantsHref = localizeHref(lang, "/stories");
  const nav = [
    { label: copy.story.home, href: localizeHref(lang, "/") },
    { label: copy.story.participants, href: participantsHref, current: true },
    { label: copy.story.team, href: localizeHref(lang, "/about") },
    { label: copy.story.contact, href: localizeHref(lang, "/contact") },
  ];

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-chapter-sentinel]");
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.chapterSentinel));
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [layout.chapters.length]);

  return (
    <div className={`storyPage ${fontClassName}`}>
      <header className="storyHeader">
        <div className="storyHeaderBar">
          <Link className="storyHeaderBack" href={participantsHref}>
            <Arrow direction="left" size={16} />
            {copy.story.backParticipants}
          </Link>
          <div className="storyBrand">
            <img src="/logo.png" alt="" width={44} height={44} />
            <span>{copy.siteName}</span>
          </div>
          <nav className="storyHeaderNav" aria-label="Primary">
            {nav.map((item) => (
              <Link key={item.label} href={item.href} aria-current={item.current ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="storyHero">
        {image ? <img className="storyHeroImage" src={image.src} alt={image.alt} /> : null}
        <div className="storyHeroShade" />
        <div className="storyHeroCopy">
          <h1 className="storyBadge">{layout.badge}</h1>
          {layout.heroQuote ? <blockquote className="storyHeroQuote">{layout.heroQuote}</blockquote> : null}
        </div>
      </section>

      {layout.intro.length ? (
        <FadeIn distance={28} duration={0.75} threshold={0.12}>
          <div className="storyIntro">
            {layout.intro.map((paragraph, index) => (
              <p key={index}>
                <RichText spans={paragraph} />
              </p>
            ))}
          </div>
        </FadeIn>
      ) : null}

      {layout.chapters.length ? (
        <div className="storyGrid">
          <aside className="storySidebar" aria-label={copy.story.sections}>
            <div className="storySidebarTrack">
            <div className="storySidebarLine" aria-hidden="true" />
            <ol>
              {layout.chapters.map((chapter, index) => {
                const current = index === active;
                return (
                  <li key={chapter.id} className={current ? "isActive" : undefined}>
                    <span className="storySidebarDot" aria-hidden="true" />
                    <p className="storyNavLabel">{chapter.navLabel}</p>
                    {chapter.quote || chapter.era ? (
                      <p className="storyNavTitle">
                        {chapter.quote ? <span className="storyNavTitleText">{chapter.quote}</span> : null}
                        {chapter.era ? (
                          <>
                            {chapter.quote ? <br /> : null}
                            <span className="storyNavEra">{chapter.era}</span>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {chapter.nodes.length ? (
                      <div className="storyNodes">
                        {chapter.nodes.map((node) =>
                          node.id ? (
                            <Link key={node.id} href={`${localizeHref(lang, "/timeline")}#${node.id}`}>
                              · {node.label}
                            </Link>
                          ) : (
                            <span key={node.label}>· {node.label}</span>
                          ),
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            </div>
          </aside>
          <div className="storyMain">
            {layout.chapters.map((chapter, index) => (
              <div data-chapter-sentinel={index} key={chapter.id}>
                <ChapterCard chapter={chapter} />
              </div>
            ))}
            <div className="storyActions">
              <Link className="storyAction storyActionPrimary" href={collectionHref || participantsHref}>
                <Arrow direction="left" size={18} />
                {collectionLabel || copy.story.backParticipants}
              </Link>
              {nextHref ? (
                <Link className="storyAction storyActionSecondary" href={nextHref}>
                  {copy.story.next}
                  <Arrow direction="right" size={18} />
                </Link>
              ) : null}
            </div>
            {externalHref ? (
              <p className="storyArchiveLink">
                <a href={externalHref} rel="noopener noreferrer" target="_blank">
                  {copy.story.archiveLink}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="storyFooter">
        <div className="storyFooterBar">
          <div className="storyBrand storyFooterBrand">
            <img src="/logo.png" alt="" width={48} height={48} />
            <span>{copy.siteName}</span>
          </div>
          <p>{copy.story.rights}</p>
        </div>
      </footer>
    </div>
  );
}
