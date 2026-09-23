import type { Metadata } from "next";

export const metadata: Metadata = { title: "Interactive Timeline" };

export default function TimelinePage() {
  return (
    <>
      <section className="pageHero"><div className="container"><p className="eyebrow">Context</p><h1 className="display">Interactive Timeline</h1><p className="lede">A custom timeline shell ready for verified events from the existing archive.</p></div></section>
      <section className="section"><div className="container widePanel"><div className="timeline">
        <div className="timelineItem"><h3>Timeline content migration</h3><p>Verified events from the existing archive will be placed here.</p></div>
        <div className="timelineItem"><h3>Story connections</h3><p>Each event can link to related stories, themes, and collections.</p></div>
        <div className="timelineItem"><h3>Filters and interaction</h3><p>We can add category filters and expandable details without relying on a WordPress timeline plugin.</p></div>
      </div></div></section>
    </>
  );
}
