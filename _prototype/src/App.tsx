import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import logoImg from "@/imports/logo.png";
import heroImg from "@/imports/SENJ6_1620154170.png";
import bmnjPhoto from "@/imports/image_1620663833.jpg";
import reyesPhoto from "@/imports/reyes.laurent_1761783150.jpg";

type ArchiveTransitionDirection = "forward" | "back";

function runArchiveTransition(
  update: () => void,
  direction: ArchiveTransitionDirection,
  afterUpdate?: () => void,
) {
  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!transitionDocument.startViewTransition || reducedMotion) {
    flushSync(update);
    afterUpdate?.();
    return;
  }

  document.documentElement.dataset.archiveTransition = direction;
  const transition = transitionDocument.startViewTransition(() => {
    flushSync(update);
    afterUpdate?.();
  });
  transition.finished.finally(() => {
    delete document.documentElement.dataset.archiveTransition;
  });
}

// ── Scroll fade-in hook ──────────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── FadeSection wrapper ──────────────────────────────────────────────────────
function FadeSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── BMNJ story content ───────────────────────────────────────────────────────
const bmnjSections = [
  {
    quote: "Stand up for your rights!",
    body: `I was raised in Harlem. We grew up in a community with a lot of very prominent African Americans in the Harlem community. There was always something going on in the Harlem community, people protesting for rights about the school, education, jobs, city services. Harlem was such a thriving community. It was a thriving metropolis for Blacks.\n\nWhen I was younger, my grandfather had sent me to Baptist Church. That was at Clayton Powell Jr.'s church. He was very much an activist in the Harlem community. The main shot of district for Harlem then was 125th Street, the major stores were white-owned, and blacks were restricted from going there. A lot of stores did not employ blacks in the neighborhood. The community didn't benefit from these shops there. Then Adam Clayton Powell got a movement going that if they wanted Blacks to shop in the store, they needed to employ us and support the community. He was organizing marches along 125th Street. My parents were part of his church, so they were activists in the movement.\n\nAdam Clayton Powell Jr. was a very prominent reverend in the Harlem community. It was a very big church, and he later became a congressman. He organized these marches. The main target that Adam Clayton Powell chose was the store called Blumstein's. It was the major department store on 125th. It was the Harlem equivalent of Macy's. It was a very good store, and everybody shopped there. When Adam Clayton organized this march, my parents got involved. My first indication is what it was, stand up for your rights!`,
  },
  {
    quote: "This was just a way of life for us, serving our community.",
    body: `As we're growing up, we're serving. It was like upper-middle-class apartments that I was raised in. We had gardens there. It was our duty to maintain the garden. We used to rake leaves and turn the soil. All this is a means of giving back to your community, serving your community. \n\nAt the church I went to, there was always something where we made meals for the people that were struggling who couldn't come to church. They would give you the place and say, "Go take this to Ms. X around the corner." This was just a way of life for us, serving our community. If there was an area in the community that- let's say, the garbage accumulated in. Somebody would say, "Let's organize a cleanup." We would get out there with brooms and clean our neighborhoods. It was our duty to maintain our neighborhoods. All this is service to your community, and it becomes second nature. When you saw some older woman coming home with grocery bags, you'd better say, "Hold on, Ms. X. I'll carry that bag for you." You were learning service.\n\n When you're young and going through it, you're not understanding why am I doing this. Why there's a block cleanup? You realize the reason for the block cleanup is because the City Department of Sanitation isn't coming through to clean the block up. You don't learn this at the time, but by doing this service, as I got older, this is when I started to make the connections, though. The service that I do now is what I was raised to do, so I never feel like I'm doing anything special. I'm doing what needs to be done to help my community and my people survive and go further.\n\nI realize now that what we're doing is for survival. In fact, that's what we did for survival, but the children didn't understand that because they learned that this is what you do. Like when you're sitting in the kitchen, and your mother is showing you how to cook an egg, they're teaching how to survive and eat. They're not sitting there teaching you, "Well, you may have to cook for dinner one time, so this is just a survival skill." You learn for your community that these are survival skills you have to do.\n\nGoing to school and getting an education is something that you have to do. Learning the trades, to maybe making a living, is something that you have to do. You also have to do something to take care of your sick neighbor or somebody that doesn't have as much for you. If you have something to help them, you just do it. `,
  },
  {
    quote: "I got some more kids my age to come along, and we got on the picket lines.",
    body: `I was in junior high school or high school. We were trying to get our community center reopened. A lot of the adults wanted to participate. They all said, "Yes. Let's do this. Let's do that." I came along. "Yes, I want in." They was like, "No. You're too young. You're too young." I can remember arguing with them about this. In hindsight, they were probably trying to protect me. To say that this could turn out to be real ugly. Like maybe people getting arrested or beat by police and by governmental forces. They thought I was too young and shouldn't be involved in this kind of stuff. I also understood the rec center they were trying to get open was for people my age, so we stayed involved. \n\nThey were going to form picket lines, and they thought that probably there's going to end up being a lot of arrests, and no. I got some more kids my age to come along, and we got on the picket lines just along with them. Fortunately, nothing came about. It was like, "You can't turn us around." I was looking at the civil rights movement. If you look at it, there's always been youth that has been very much involved in things."`,
  },
  {
    quote: "We organized a school bus trip to Albany where we talked to our state legislators.",
    body: `When I was in college, we were trying to get college funding expanded. I was very involved in that, with the school movement and writing letters, lobbying politicians, organizing people, "Let's do this," We organized a school bus trip to Albany where we talked to our state legislators. Of course, I can remember that somebody made it where I could go to college. They had programs that funded me to go to college. Had I not found this funding, it wouldn't have happened. \n\nThere's programs that they had they called the SEEK program. Many things flowed out of the SEEK program, where you are paying for your books and tuition. In X University, there was no tuition, but even with no tuition, you hardly could afford it. It was like they would pay the tuition for us. I know it's me today, and whoever came behind me, they too needed to get that money, so we fought for them. "`,
  },
  {
    quote: "I'm president of the National Association for the Advancement of Colored People (NAACP).",
    body: ` I'm president of the National Association for the Advancement of Colored People (NAACP) in the town over. I'm also the first vice president for the state conference of the NAACP, and I also sit on the resolution committee for the national board of the NAACP. We work with students, we have a mentor group, and there's other kids, high school kids, all the way up to adults. NAACP was formed back in 1908 by a multiracial organization. The name is colored people, but I know in my chapter there's a large white contingent; we have Latinos, Asians, and Southeast Asians. \n\nMy family has been very much an activist family. I remember being on picket lines about racial injustice. It's something that I've grown up into different organizations but fighting the same fight. Growing up in Harlem, NAACP would have some programs that I've been involved with. It's always been an organization I've been around. I don't remember exactly how I got plugged with them. I was going to some meetings, and then I became a member. I've always done a lot of work with them before I actually signed up and became an active member. I'm thinking it was maybe 25, 30 years ago when I first became an active member.\n\nThe work I do with them benefits my community, my town, the town over, and the greater society nationally and internationally. If I was doing something for, let's say, maybe environmental concerns, it'll help the greater society at large and a lot of my civil rights concerns. It'll be a national effect and an international effect."`,
  },
  {
    quote: "I wanted to participate in the primary elections.",
    body: `I've worked with the politicians to get people elected. That is totally outside of the NAACP hat. I'm a Democratic chair, so I volunteer with the Democratic Party. I support a lot of the Democratic principles, but usually-- For the most part, I do support the Democratic plate because I'm not what you'd call-- I don't vote by party, I vote by people. The Democratic Party tends to be more responsive to my issues and my agenda, so that's who I tend to vote for.When I joined the active Democratic party, I signed on as a Democrat in the late '90s because I wanted to participate in the primary elections. We had primary elections because there was certain candidates I wanted to push in the primary election. In order to push a candidate, you had to be a member of the party. That's how I formerly ended up joining the party."`,
  },
  {
    quote: "I helped in passing the law because I said something.",
    body: `When Katrina happened, all these places got flooded out down in Louisiana. I remember, I read there was a bill going through congress that they wanted to get some more funding to re-appropriate money for the families that were devastated by Katrina. Get some more money to get their lives back together. I read that one of our local politicians was not going to sign the authorization for the folks to get that money. It was going to be a close vote, so every vote was needed. When I saw it, I called him [chuckles], "You got to do something about this." He explained to me; he said, "there's a lot of pork in this for this organization to get money donated." He says, "Let's talk about it."\n\nThe next day we sat down and talked about it. He showed me the bill and showed me these thousands of dollars would go here for somebody to put a new garbage can there. This one was thousands of dollars to paint a road there. After he explained it all to me, I said, "But look, if this bill doesn't get signed," I said, "Those people don't get the money." I read in the paper the next day that he signed onto it. I tell people how sometimes when they say one person don't matter, yes, one person does matter. I feel like perhaps a family in Katrina got a check because I helped in passing the law because I said something.\n\nIt encourages me to keep doing what I do. I've seen I can help. I've had losses [laughs]. Since the last time, I'm going to people like politicians to sign on for this, and it didn't happen, but still you keep going. You keep going, this is what I have to do."`,
  },
];

// ── Shared header ────────────────────────────────────────────────────────────
const navLinks = [
  "Home",
  "Interactive Timeline",
  "Share Your Story",
  "Participants",
  "Our Team",
  "Rightful Participation",
  "For Research",
  "Contact Us",
];

function SiteHeader({
  onBack,
  onNav,
  activePage,
}: {
  onBack?: () => void;
  onNav?: (link: string) => void;
  activePage?: string;
}) {
  const activeLink = activePage ?? "Participants";
  return (
    <header
      style={{ backgroundColor: "var(--brand-dark)", fontFamily: "var(--font-sans)" }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <img
          src={logoImg}
          alt="Our Way of Life Archive"
          className="h-16 w-16 object-contain flex-shrink-0 cursor-pointer"
          onClick={onBack ?? (onNav ? () => onNav("Home") : undefined)}
        />
        <nav className="flex-1 flex items-center justify-center flex-wrap gap-x-6 gap-y-1">
          {onBack && !onNav ? (
            <button
              onClick={onBack}
              style={{ color: "var(--brand-amber)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              className="text-sm flex items-center gap-2"
            >
              ← Back to Participants
            </button>
          ) : (
            navLinks.map((link) => {
              const isActive = link === activeLink;
              return (
                <a
                  key={link}
                  href="#"
                  onClick={onNav ? (e) => { e.preventDefault(); onNav(link); } : undefined}
                  style={{
                    color: isActive ? "var(--brand-amber)" : "var(--brand-cream)",
                    fontWeight: isActive ? 600 : 400,
                    borderBottom: isActive ? "2px solid var(--brand-amber)" : "2px solid transparent",
                  }}
                  className="text-sm pb-0.5 hover:opacity-80 transition-opacity whitespace-nowrap"
                >
                  {link}
                </a>
              );
            })
          )}
        </nav>
        <div style={{ color: "var(--brand-cream)" }} className="flex items-center gap-4 flex-shrink-0">
          <button className="hover:opacity-70 transition-opacity" aria-label="Search">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <button className="hover:opacity-70 transition-opacity" aria-label="Account">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Shared footer ────────────────────────────────────────────────────────────
function SiteFooter({ onBack }: { onBack?: () => void }) {
  return (
    <footer style={{ backgroundColor: "var(--brand-cream)", borderTop: "1px solid var(--brand-border)" }}>
      <div className="max-w-7xl mx-auto px-6 py-10 flex items-center justify-between flex-wrap gap-4">
        <img src={logoImg} alt="Our Way of Life Archive" className="h-16 w-16 object-contain cursor-pointer" onClick={onBack} />
        <p className="text-sm" style={{ color: "var(--brand-dark)", opacity: 0.6 }}>
          © 2026 Our Way of Life Archive. All rights reserved.
        </p>
        <div className="flex gap-6">
          {["Home", "Participants", "Contact Us"].map((link) => (
            <a key={link} href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "var(--brand-dark)" }}>
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ── BMNJ Story Page (redesigned) ────────────────────────────────────────────
const JK = "\"Plus Jakarta Sans\", \"DM Sans\", system-ui, sans-serif";
const CG = "\"Cormorant Garamond\", Georgia, serif";

const chapters = [
  {
    navLabel: "Youth and Adolescence (-18)",
    tag: "Youth and Adolescence (-18)",
    title: "Stand up for your rights!",
    era: "1950s-1960s",
    nodes: ["125th St Marches", "Adam Clayton Powell Jr.", "Blumstein's Boycott"],
    quote: "Stand up for your rights!",
    sectionIndices: [0, 1],
  },
  {
    navLabel: "Adulthood (20-59)",
    tag: "Adulthood (20-59)",
    title: "We organized a school bus trip to Albany",
    era: "1960s-1970s",
    nodes: ["Community Center Picket", "SEEK Program", "Albany Lobby Trip"],
    quote: "We organized a school bus trip to Albany where we talked to our state legislators.",
    sectionIndices: [2, 3],
  },
  {
    navLabel: "Older Adulthood (60+)",
    tag: "Older Adulthood (60+)",
    title: "I'm president of NAACP",
    era: "Present Day",
    nodes: ["NAACP President", "State Conference VP", "Youth Mentorship"],
    quote: "I'm president of the National Association for the Advancement of Colored People (NAACP).",
    sectionIndices: [4],
  },
];

function BmnjTimelineSpine({ activeChapter }: { activeChapter: number }) {
  return (
    <aside style={{
      width: "280px",
      flexShrink: 0,
      position: "sticky",
      top: "80px",
      height: "calc(100vh - 100px)",
      overflowY: "auto",
      paddingRight: "32px",
      paddingTop: "8px",
    }}>
      {/* Vertical spine line */}
      <div style={{ position: "relative", paddingLeft: "28px" }}>
        <div style={{
          position: "absolute",
          left: "9px",
          top: "10px",
          bottom: "10px",
          width: "2px",
          backgroundColor: "#D8CFBC",
        }} />

        {chapters.map((ch, i) => {
          const isActive = i === activeChapter;
          return (
            <div key={ch.num} style={{ position: "relative", marginBottom: "40px" }}>
              {/* Gold node circle */}
              <div style={{
                position: "absolute",
                left: "-28px",
                top: "4px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: isActive ? "#DEB353" : "#D8CFBC",
                border: `3px solid ${isActive ? "#DEB353" : "#C8BFA8"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isActive ? "0 0 0 4px rgba(222,179,83,0.2)" : "none",
                transition: "all 0.3s ease",
                zIndex: 2,
              }}>
                <div style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: isActive ? "#fff" : "#9A8F7C",
                }} />
              </div>

              {/* Chapter label */}
              <p style={{
                fontFamily: JK,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isActive ? "#DEB353" : "#8B7355",
                marginBottom: "4px",
                transition: "color 0.3s ease",
              }}>
                {ch.navLabel}
              </p>
              <p style={{
                fontFamily: JK,
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#2C1B14" : "#6B5B47",
                marginBottom: "8px",
                lineHeight: 1.3,
                transition: "color 0.3s ease",
              }}>
                {ch.title}<br />
                <span style={{ fontSize: "11px", color: "#9A8F7C", fontWeight: 400 }}>{ch.era}</span>
              </p>

              {/* Sub-labels */}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {ch.nodes.map((node) => (
                  <span key={node} style={{
                    fontFamily: JK,
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isActive ? "#8B4513" : "#AAA090",
                    lineHeight: 1.5,
                  }}>
                    &middot; {node}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function BmnjChapterCard({ chapter, sectionData }: {
  chapter: typeof chapters[0];
  sectionData: typeof bmnjSections;
}) {
  const { ref, visible } = useFadeIn(0.06);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        backgroundColor: "#FAF7F0",
        border: "1px solid #E8E0CE",
        borderRadius: "4px",
        overflow: "hidden",
        marginBottom: "32px",
      }}
    >
      {/* Chapter header band */}
      <div style={{
        padding: "20px 36px 16px",
        borderBottom: "1px solid #E8E0CE",
        backgroundColor: "#F2EDE0",
      }}>
        <p style={{
          fontFamily: JK,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8B4513",
          marginBottom: "0",
        }}>
          {chapter.tag}
        </p>
      </div>

      <div style={{ padding: "36px" }}>
        {/* Pull quote */}
        <blockquote style={{
          fontFamily: CG,
          fontSize: "28px",
          fontStyle: "italic",
          fontWeight: 400,
          color: "#2C1B14",
          lineHeight: 1.45,
          margin: "0 0 28px",
          paddingLeft: "24px",
          borderLeft: "3px solid #DEB353",
          position: "relative",
        }}>
          <span style={{
            position: "absolute",
            left: "0",
            top: "-8px",
            fontFamily: CG,
            fontSize: "64px",
            color: "#DEB353",
            lineHeight: 1,
            opacity: 0.6,
            userSelect: "none",
            pointerEvents: "none",
          }}>"</span>
          {chapter.quote}
        </blockquote>

        {/* Divider rule */}
        <div style={{ height: "1px", backgroundColor: "#DDD7CA", margin: "0 0 28px" }} />

        {/* Narrative paragraphs from sections */}
        {sectionData.map((section, si) => (
          <div key={si} style={{ marginBottom: si < sectionData.length - 1 ? "24px" : 0 }}>
            {section.body.split("\n\n").map((para, pi) => (
              <p key={pi} style={{
                fontFamily: JK,
                fontSize: "20px",
                lineHeight: 1.65,
                color: "#22201D",
                margin: pi === 0 ? 0 : "1.1em 0 0",
              }}>
                {para.trim()}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BmnjStoryPage({ onBack }: { onBack: () => void }) {
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const sentinels = document.querySelectorAll("[data-chapter-sentinel]");
    if (!sentinels.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.chapterSentinel);
            setActiveChapter(idx);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sentinels.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: JK, backgroundColor: "#F7F5EE", minHeight: "100vh" }}>
      {/* Top nav — dark espresso with gold accent line */}
      <header style={{
        backgroundColor: "#3A1F0D",
        borderBottom: "2px solid #DEB353",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 40px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: JK,
              fontSize: "13px",
              fontWeight: 600,
              color: "#DEB353",
              letterSpacing: "0.04em",
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Participants
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={logoImg} alt="Our Way of Life Archive" style={{ height: "44px", width: "44px", objectFit: "contain" }} />
            <span style={{
              fontFamily: CG,
              fontSize: "14px",
              color: "#F5EFE0",
              letterSpacing: "0.06em",
            }}>
              Our Way of Life Archive
            </span>
          </div>

          <nav style={{ display: "flex", gap: "28px" }}>
            {["Home", "Participants", "Our Team", "Contact"].map((link) => (
              <a key={link} href="#" style={{
                fontFamily: JK,
                fontSize: "13px",
                fontWeight: 500,
                color: link === "Participants" ? "#DEB353" : "#D4C8B4",
                textDecoration: "none",
              }}>
                {link}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero — full-bleed photo with gradient overlay */}
      <div style={{ position: "relative", height: "65vh", overflow: "hidden", backgroundColor: "var(--brand-dark)" }}>
        <img
          src={bmnjPhoto}
          alt="BMNJ at the US Supreme Court"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(91,37,9,0.85) 0%, rgba(91,37,9,0.2) 55%, transparent 100%)",
        }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 48px", maxWidth: "860px" }}>
          <span style={{
            display: "inline-block",
            backgroundColor: "rgba(91,37,9,0.9)",
            color: "var(--brand-cream)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.14em",
            padding: "4px 12px",
            borderRadius: "4px",
            marginBottom: "16px",
            backdropFilter: "blur(4px)",
          }}>
            BMNJ &middot; Manhattan, NY &rarr; Newark, NJ
          </span>
          <blockquote style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontStyle: "italic",
            color: "var(--brand-cream)",
            lineHeight: 1.5,
            margin: 0,
            borderLeft: "3px solid var(--brand-amber)",
            paddingLeft: "20px",
          }}>
            "The service that I do now is what I was raised to do, so I never feel like I'm doing anything special.
            I'm doing what needs to be done to help my community and my people survive and go further."
          </blockquote>
        </div>
      </div>

      {/* Opening context */}
      <FadeSection>
        <div style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "64px 24px 48px",
          borderBottom: "1px solid var(--brand-border)",
        }}>
          <p style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.15rem",
            lineHeight: 1.85,
            color: "#2C1A0E",
          }}>
            BMNJ was born in Manhattan in 1954 but grew up in Harlem, surrounded by a strong and thriving Black community. His parents were involved in community activism and politics in Harlem. His desire to get involved in community matters started from a very young age and only grew stronger with age. He moved to New Jersey thirty-four years ago, where he continues to be politically and socially involved. Most of his activism is through the NAACP, where he is a formal member and has received various awards for his work. However, informally, he helps organize community groups that want to get involved with voter registration, block cleanups, and other civic activities. He attributes his commitment to helping others to his upbringing and faith and considers civic participation "a way of life."
          </p>
        </div>
      </FadeSection>

      {/* 2-Column body: sticky spine + chapters */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "60px 40px 80px",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: "60px",
        alignItems: "start",
      }}>
        <BmnjTimelineSpine activeChapter={activeChapter} />

        {/* Narrative reading area */}
        <main style={{ minWidth: 0 }}>
          {chapters.map((ch, ci) => (
            <div key={ch.num} data-chapter-sentinel={ci} style={{ marginBottom: "16px" }}>
              <BmnjChapterCard
                chapter={ch}
                sectionData={ch.sectionIndices.map((idx) => bmnjSections[idx])}
              />
            </div>
          ))}

          {/* Footer navigation */}
          <div style={{
            marginTop: "48px",
            paddingTop: "40px",
            borderTop: "1px solid #DDD7CA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}>
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#2C1B14",
                color: "#F5EFE0",
                border: "none",
                padding: "18px 32px",
                borderRadius: "4px",
                fontFamily: JK,
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
                transition: "background 0.2s ease",
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back to African American Collection
            </button>

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "transparent",
                color: "#2C1B14",
                border: "2px solid #2C1B14",
                padding: "16px 32px",
                borderRadius: "4px",
                fontFamily: JK,
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
                transition: "all 0.2s ease",
              }}
            >
              Next Participant Story
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </main>
      </div>

      {/* Site footer */}
      <footer style={{
        backgroundColor: "#2C1B14",
        borderTop: "2px solid #DEB353",
        padding: "40px",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={logoImg} alt="Our Way of Life Archive" style={{ height: "48px", width: "48px", objectFit: "contain" }} />
            <span style={{ fontFamily: CG, fontSize: "13px", color: "#C8B898", letterSpacing: "0.06em" }}>
              Our Way of Life Archive
            </span>
          </div>
          <p style={{ fontFamily: JK, fontSize: "12px", color: "#8B7355" }}>
            © 2026 Our Way of Life Archive. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Splash Screen ────────────────────────────────────────────────────────────
let hasPlayedSplash = false;

function SplashScreen() {
  const [visible, setVisible] = useState(() => !hasPlayedSplash);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    hasPlayedSplash = true;
    const t1 = setTimeout(() => setExiting(true), 2600);
    const t2 = setTimeout(() => setVisible(false), 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @property --fan-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes splash-fan-open {
          0% {
            --fan-angle: 0deg;
          }
          100% {
            --fan-angle: 180deg;
          }
        }
        .sp-logo-fan {
          -webkit-mask-image: conic-gradient(
            from 270deg at 50% 68%,
            #000 0deg,
            #000 var(--fan-angle),
            transparent var(--fan-angle),
            transparent 360deg
          );
          mask-image: conic-gradient(
            from 270deg at 50% 68%,
            #000 0deg,
            #000 var(--fan-angle),
            transparent var(--fan-angle),
            transparent 360deg
          );
          animation: splash-fan-open 1.0s cubic-bezier(0.34, 1.35, 0.64, 1) 0.45s both;
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backgroundColor: "#DCAD57",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        transition: exiting ? "opacity 1.5s ease, transform 1.5s ease" : "none",
        pointerEvents: exiting ? "none" : "all",
        perspective: "900px",
      }}>
        <div style={{
          position: "relative",
          width: "min(82vw, 520px)",
          aspectRatio: "1",
        }}>
          <img
            src={logoImg}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              clipPath: "inset(68% 0 0 0)",
            }}
          />
          <img
            className="sp-logo-fan"
            src={logoImg}
            alt="Our Way of Life Archive"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </>
  );
}

// ── Participant data ──────────────────────────────────────────────────────────
const participants = [
  {
    id: "BMNJ",
    location: "Manhattan, NY → Newark, NJ",
    quote: "Serving our community was a way of life — it's what needs to be done to keep my people alive.",
    photo: bmnjPhoto,
    hasStory: true,
  },
  {
    id: "MGNJ",
    location: "El Salvador → New Jersey",
    quote: "Colaborar económicamente es la forma en la que me gusta ayudar — esa es la necesidad de la comunidad.",
    photo: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "EBNJ",
    location: "Born 1941, Alabama → New Jersey",
    quote: "There I was standing up for democracy and freedom, yet we didn't have it back home.",
    photo: "https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "AMWE",
    location: "Veracruz, Mexico → California",
    quote: "Me dejo llevar por la corriente — siempre espero algo positivo de la vida.",
    photo: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "EMWE",
    location: "Michoacán, Mexico → California",
    quote: "Todo es bienvenido. Nunca sé lo que va a suceder, pero confío en mi comunidad.",
    photo: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "AAWE",
    location: "San Salvador, El Salvador → California",
    quote: "La comunidad me dio todo lo que soy. Es mi deber devolverle algo.",
    photo: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "LAWE",
    location: "Jalisco, Mexico → California",
    quote: "A los 53 años empecé de nuevo — y la comunidad fue mi primer hogar.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "MMWE",
    location: "San Salvador, El Salvador → California",
    quote: "La fe en acción es lo que nos mantiene unidos — no hay otra manera.",
    photo: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
  {
    id: "MVWE",
    location: "Michoacán, Mexico → California",
    quote: "Mi historia empezó allá, pero mi corazón y mi lucha pertenecen aquí.",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop&auto=format",
    hasStory: false,
  },
];

const latineParticipantIds = new Set(["MGNJ", "AMWE", "EMWE", "AAWE", "LAWE", "MMWE", "MVWE"]);
const africanAmericanParticipantIds = new Set(["BMNJ", "EBNJ"]);

function ParticipantStoryCard({
  participant,
  onOpenStory,
}: {
  participant: (typeof participants)[number];
  onOpenStory?: () => void;
}) {
  return (
    <a
      href="#"
      onClick={participant.hasStory && onOpenStory
        ? (event) => { event.preventDefault(); onOpenStory(); }
        : undefined}
      className="story-card block rounded-xl overflow-hidden no-underline"
      style={{
        backgroundColor: "var(--brand-card)",
        border: "1px solid var(--brand-border)",
        textDecoration: "none",
        cursor: participant.hasStory && onOpenStory ? "pointer" : "default",
      }}
    >
      <div className="relative overflow-hidden" style={{ paddingTop: "70%" }}>
        <img
          src={participant.photo}
          alt={`Portrait for participant ${participant.id}`}
          className="story-card-portrait absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: participant.id === "BMNJ" ? "center center" : "center" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(91,37,9,0.6) 0%, transparent 50%)" }}
        />
        <span
          className="absolute bottom-2 left-2 font-semibold px-2 py-0.5 rounded"
          style={{
            fontSize: "0.65rem",
            backgroundColor: "rgba(91,37,9,0.88)",
            color: "var(--brand-cream)",
            backdropFilter: "blur(4px)",
            letterSpacing: "0.12em",
          }}
        >
          {participant.id}
        </span>
      </div>

      <div className="p-4 flex flex-col justify-between" style={{ minHeight: "140px" }}>
        <div>
          <span style={{
            fontFamily: "var(--font-serif)",
            color: "var(--brand-amber)",
            fontSize: "2rem",
            lineHeight: "0.8",
            display: "block",
            marginBottom: "4px",
          }}>
            "
          </span>
          <p style={{
            fontFamily: "var(--font-serif)",
            color: "var(--brand-dark)",
            fontSize: "0.85rem",
            lineHeight: "1.55",
            fontStyle: "italic",
          }}>
            {participant.quote}
          </p>
        </div>
        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: "1px solid var(--brand-border)" }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--brand-dark)", opacity: 0.6 }}>
            {participant.location}
          </span>
          <span style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: participant.hasStory ? "var(--brand-red)" : "var(--brand-dark)",
            opacity: participant.hasStory ? 1 : 0.35,
          }}>
            {participant.hasStory ? "Read Story →" : "Coming soon"}
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Archive Exhibition Volume ─────────────────────────────────────────────────
function ArchiveVolume({
  volumeTag,
  title,
  description,
  coverColor,
  img,
  imgAlt,
  defaultActive = false,
  onOpen,
  showVolumeTag = true,
  heroLayerName,
  layerName,
  imageLayerName,
  titleLayerName,
  transitionName,
}: {
  volumeTag: string; title: string; description: string;
  coverColor: string; img: string; imgAlt: string; defaultActive?: boolean; onOpen?: () => void;
  showVolumeTag?: boolean;
  heroLayerName?: string; layerName?: string; imageLayerName?: string; titleLayerName?: string; transitionName?: string;
}) {
  const [active, setActive] = useState(defaultActive);
  return (
    <div
      className="archive-volume"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(defaultActive ? true : false)}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen();
        }
      }}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Open ${title}` : undefined}
      data-hero-layer-name={heroLayerName}
      data-layer-name={layerName}
      style={{
        width: "100%",
        maxWidth: "350px",
        minWidth: 0,
        aspectRatio: "35 / 54",
        position: "relative",
        cursor: "pointer",
        transform: active ? "translateY(-12px)" : "translateY(0)",
        transition: "transform 0.4s cubic-bezier(0.34,1.4,0.64,1)",
        viewTransitionName: transitionName,
      }}
    >
      {/* Ambient shadow beneath book */}
      <div style={{
        position: "absolute",
        bottom: active ? "-18px" : "-8px",
        left: "8%",
        right: "8%",
        height: "18px",
        background: "radial-gradient(ellipse, rgba(20,8,2,0.45) 0%, transparent 70%)",
        transition: "bottom 0.4s ease, opacity 0.4s ease",
        opacity: active ? 1 : 0.6,
        filter: `blur(${active ? 6 : 3}px)`,
        zIndex: 0,
      }} />

      {/* Book body */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        zIndex: 1,
        filter: active ? "drop-shadow(0 20px 40px rgba(20,8,2,0.35))" : "drop-shadow(0 6px 16px rgba(20,8,2,0.28))",
        transition: "filter 0.4s ease",
      }}>
        {/* Spine */}
        <div style={{
          width: "14px",
          height: "100%",
          flexShrink: 0,
          borderRadius: "4px 0 0 4px",
          background: `linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 30%, ${coverColor} 55%, rgba(255,255,255,0.06) 80%, rgba(0,0,0,0.1) 100%)`,
        }}>
          {/* Spine crease highlight */}
          <div style={{
            marginLeft: "7px",
            width: "1.5px",
            height: "100%",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.18) 100%)",
          }} />
        </div>

        {/* Front cover */}
        <div style={{
          flex: 1,
          height: "100%",
          borderRadius: "0 4px 4px 0",
          backgroundColor: coverColor,
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 5px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 5px)
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(14px, 1.5vw, 22px) clamp(12px, 1.4vw, 20px) clamp(14px, 1.4vw, 20px)",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Top edge shadow */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "8px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.28), transparent)",
            pointerEvents: "none",
          }} />

          {/* Volume tag */}
          {showVolumeTag && (
            <p style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "clamp(8px, 0.8vw, 11px)",
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#E5CA95",
              margin: "0 0 14px",
              textTransform: "uppercase",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}>
              {volumeTag}
            </p>
          )}

          {/* Title */}
          <h3 data-layer-name={titleLayerName} style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "clamp(18px, 1.7vw, 24px)",
            fontWeight: 600,
            color: "#E5CA95",
            textAlign: "center",
            margin: "0 0 14px",
            lineHeight: 1.2,
            textShadow: "0 1px 5px rgba(0,0,0,0.55)",
            letterSpacing: "0.01em",
          }}>
            {title}
          </h3>

          {/* Tipped-in photo */}
          <div style={{
            position: "relative",
            width: "100%",
            flex: 1,
            minHeight: 0,
            margin: "0 0 14px",
          }}>
            <img
              src={img}
              alt={imgAlt}
              data-layer-name={imageLayerName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                filter: "grayscale(100%) contrast(1.1) brightness(0.88) sepia(8%)",
                display: "block",
              }}
            />
            {/* 1px warm gold rule frame */}
            <div style={{
              position: "absolute",
              inset: "4px",
              border: "1px solid rgba(229,202,149,0.55)",
              pointerEvents: "none",
            }} />
          </div>

          {/* Description */}
          <p style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(10px, 0.92vw, 13px)",
            fontStyle: "italic",
            color: "#FAF5EC",
            textAlign: "center",
            lineHeight: 1.5,
            margin: "0 0 12px",
            opacity: 0.9,
          }}>
            {description}
          </p>

          {/* Bottom indicator — no button, just an elegant text cue */}
          <p style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "clamp(9px, 0.84vw, 12px)",
            fontWeight: 500,
            letterSpacing: "0.1em",
            color: "#E5CA95",
            margin: 0,
            textTransform: "uppercase",
            opacity: 0.85,
          }}>
            Explore Volume →
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Filtered collection pages ────────────────────────────────────────────────
type CollectionKey = "latine" | "africanAmerican" | "chinese";

type CollectionCardData = {
  id: string;
  quote: string;
  location: string;
  photo: string;
  photoAlt: string;
  hasStory: boolean;
};

const collectionPages: Record<CollectionKey, {
  title: string;
  gradient: string;
  accent: string;
  mutedAccent: string;
  book: {
    volumeTag: string;
    description: string;
    coverColor: string;
    image: string;
    imageAlt: string;
    heroLayerName: string;
    layerName: string;
    imageLayerName: string;
    titleLayerName: string;
    transitionName: string;
  };
  cards: CollectionCardData[];
}> = {
  latine: {
    title: "Latine Immigrant Stories",
    gradient: "linear-gradient(145deg, #2E120D 0%, #1A0A07 100%)",
    accent: "#D9AD62",
    mutedAccent: "#B97D5F",
    book: {
      volumeTag: "Volume I",
      description: "Oral histories of migration, solidarity, and neighborhood mutual aid.",
      coverColor: "#843420",
      image: "https://images.unsplash.com/photo-1759411353705-6149080584b3?w=700&h=380&fit=crop&auto=format",
      imageAlt: "Archival documentary photo of community workers and organizers",
      heroLayerName: "Book_Hero_Latine",
      layerName: "Archive_Book/Latine",
      imageLayerName: "Image_Latine",
      titleLayerName: "Title_Latine",
      transitionName: "archive-book-latine",
    },
    cards: [],
  },
  africanAmerican: {
    title: "African American Stories",
    gradient: "linear-gradient(145deg, #0E1B2E 0%, #080F1A 100%)",
    accent: "#D4B678",
    mutedAccent: "#8FA5BD",
    book: {
      volumeTag: "Volume II",
      description: "Civil rights organizing, Harlem living memory, and generational service.",
      coverColor: "#1D242E",
      image: "https://images.unsplash.com/photo-1576568699714-a3f4950805d5?w=700&h=380&fit=crop&auto=format",
      imageAlt: "Civil rights march photograph, Library of Congress",
      heroLayerName: "Book_Hero_AfricanAmerican",
      layerName: "Archive_Book/AfricanAmerican",
      imageLayerName: "Image_AfricanAmerican",
      titleLayerName: "Title_AfricanAmerican",
      transitionName: "archive-book-african-american",
    },
    cards: [],
  },
  chinese: {
    title: "Chinese Immigrant Stories",
    gradient: "linear-gradient(145deg, #0D241B 0%, #07150F 100%)",
    accent: "#D4B76D",
    mutedAccent: "#88B29D",
    book: {
      volumeTag: "Volume III",
      description: "Labor history, displacement resilience, and Chinatown mutual aid.",
      coverColor: "#2A3A32",
      image: "https://images.unsplash.com/photo-1758547083647-e66dc420f28a?w=700&h=380&fit=crop&auto=format",
      imageAlt: "Historic Chinatown street scene, black and white",
      heroLayerName: "Book_Hero_Chinese",
      layerName: "Archive_Book/Chinese",
      imageLayerName: "Image_Chinese",
      titleLayerName: "Title_Chinese",
      transitionName: "archive-book-chinese",
    },
    cards: [],
  },
};

function CollectionArchivePage({
  collection,
  onBack,
  onNav,
  onOpenStory,
}: {
  collection: CollectionKey;
  onBack: () => void;
  onNav: (link: string) => void;
  onOpenStory: () => void;
}) {
  const volume = collectionPages[collection];

  useEffect(() => { window.scrollTo(0, 0); }, [collection]);

  return (
    <div style={{ minHeight: "100vh", background: volume.gradient }}>
      <SiteHeader onNav={onNav} activePage="Participants" />

      <main>
        <div className="px-6 lg:px-24 pt-10">
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              background: "transparent",
              color: volume.accent,
              fontFamily: JK,
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back to Archive Shelf
          </button>
        </div>

        <header className="px-6 lg:px-24 pt-12 pb-14">
          <div className="collection-volume-header">
            <div>
              <p style={{
                color: volume.mutedAccent,
                fontFamily: JK,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                margin: "0 0 16px",
              }}>
                Digital Archive
              </p>
              <h1 style={{
                color: "#F8F0DF",
                fontFamily: CG,
                fontSize: "clamp(2.6rem, 5vw, 5rem)",
                fontWeight: 600,
                lineHeight: 1.03,
                letterSpacing: "-0.025em",
                margin: 0,
                maxWidth: "900px",
              }}>
                {volume.title} <span style={{ color: volume.accent }}>— Their Words. Their Lives.</span>
              </h1>
            </div>

            <div className="collection-hero-book" data-layer-name={volume.book.heroLayerName}>
              <ArchiveVolume
                volumeTag={volume.book.volumeTag}
                title={volume.title}
                description={volume.book.description}
                coverColor={volume.book.coverColor}
                img={volume.book.image}
                imgAlt={volume.book.imageAlt}
                showVolumeTag={false}
                heroLayerName={volume.book.heroLayerName}
                layerName={volume.book.layerName}
                imageLayerName={volume.book.imageLayerName}
                titleLayerName={volume.book.titleLayerName}
                transitionName={volume.book.transitionName}
              />
            </div>
          </div>
        </header>

        <section className="px-6 lg:px-24 pb-24" aria-label={`${volume.title} gallery`}>
          <div className={collection !== "chinese" ? "participant-story-grid" : "collection-gallery-grid"}>
            {collection !== "chinese"
              ? participants
                .filter((participant) => (
                  collection === "latine"
                    ? latineParticipantIds.has(participant.id)
                    : africanAmericanParticipantIds.has(participant.id)
                ))
                .map((participant) => (
                  <ParticipantStoryCard
                    key={participant.id}
                    participant={participant}
                    onOpenStory={onOpenStory}
                  />
                ))
              : volume.cards.map((card) => (
              <article
                key={card.id}
                className="collection-archive-card"
                style={{
                  backgroundColor: "#FDF8EE",
                  border: `1px solid ${volume.accent}33`,
                }}
              >
                <div style={{ aspectRatio: "1", overflow: "hidden", backgroundColor: "#D8D0C2" }}>
                  <img
                    src={card.photo}
                    alt={card.photoAlt}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "grayscale(100%) contrast(1.08) sepia(7%)",
                    }}
                  />
                </div>

                <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <p style={{
                    color: "#7B7064",
                    fontFamily: JK,
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}>
                    Archival ID · {card.id}
                  </p>
                  <span aria-hidden="true" style={{
                    color: volume.accent,
                    fontFamily: CG,
                    fontSize: "54px",
                    lineHeight: 0.9,
                    display: "block",
                    marginTop: "20px",
                  }}>
                    “
                  </span>
                  <blockquote style={{
                    color: "#2B211C",
                    fontFamily: CG,
                    fontSize: "18px",
                    fontStyle: "italic",
                    lineHeight: 1.55,
                    margin: "4px 0 28px",
                  }}>
                    {card.quote}
                  </blockquote>

                  <div style={{
                    borderTop: "1px solid #DED4C3",
                    marginTop: "auto",
                    paddingTop: "16px",
                  }}>
                    <p style={{
                      color: "#71665B",
                      fontFamily: JK,
                      fontSize: "12px",
                      lineHeight: 1.45,
                      margin: "0 0 14px",
                    }}>
                      {card.location}
                    </p>
                    {card.hasStory ? (
                      <button
                        type="button"
                        onClick={onOpenStory}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#7D2D1E",
                          fontFamily: JK,
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Read Story →
                      </button>
                    ) : (
                      <span style={{
                        color: "#8A8074",
                        fontFamily: JK,
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}>
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              </article>
              ))}
          </div>
        </section>
      </main>

      <SiteFooter onBack={onBack} />
    </div>
  );
}

// ── Researchers Page ─────────────────────────────────────────────────────────
const CGR = '"Cormorant Garamond", Georgia, serif';

const repoRows = [
  { code: "BMNJ", background: "African American Elder", region: "Harlem, NY → NJ", lang: "English" },
  { code: "MGNJ", background: "Latina Immigrant", region: "El Salvador → NJ", lang: "Spanish & English" },
  { code: "EBNJ", background: "African American Elder", region: "Born 1941, AL → NJ", lang: "English" },
  { code: "SENJ", background: "Puerto Rican Elder", region: "Puerto Rico → NYC", lang: "Bilingual" },
];

function ResearchersPage({ onNav }: { onNav: (link: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [tab, setTab] = useState<"transcripts" | "research" | "methodology">("transcripts");

  const amber = "#C9871C";
  const darkBtn = "#231F20";
  const textDark = "#231F20";
  const textMuted = "rgba(35,31,32,0.6)";

  return (
    <div style={{ backgroundColor: amber, fontFamily: CGR, minHeight: "100vh" }}>
      <SiteHeader onNav={onNav} activePage="For Research" />

      {/* ── Tab bar ── */}
      <div style={{ borderBottom: "1px solid rgba(35,31,32,0.2)", padding: "0 48px", backgroundColor: amber }}>
        <div
          role="tablist"
          aria-label="Research resources"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          {([
            { key: "transcripts", label: "Story Transcripts" },
            { key: "research", label: "Research & Publications" },
            { key: "methodology", label: "Research Methodology" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              style={{
                fontFamily: CGR,
                fontSize: "17px",
                fontWeight: tab === key ? 700 : 400,
                color: textDark,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "20px 32px 18px",
                width: "100%",
                textAlign: "center",
                borderBottom: tab === key ? `3px solid ${textDark}` : "3px solid transparent",
                marginBottom: "-1px",
                opacity: tab === key ? 1 : 0.55,
                transition: "opacity 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Story Transcripts ── */}
      {tab === "transcripts" && (
        <section style={{
          backgroundColor: amber,
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          padding: "80px 48px",
        }}>
          <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{
              fontFamily: CGR,
              fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
              fontWeight: 600,
              color: textDark,
              marginBottom: "20px",
            }}>
              Open-Access Story Repository &amp; Direct Download Hub
            </h2>
            <p style={{
              fontFamily: CGR,
              fontSize: "18px",
              color: textMuted,
              lineHeight: 1.7,
              marginBottom: "44px",
            }}>
              Download complete, de-identified transcripts and primary documents for educational and scholarly research.
            </p>
            <a
              href="https://drive.google.com/drive/folders/1UkzJwNYZLFRyOMzW1rgn37vUc9-GVIWm?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: darkBtn,
              color: "#E7D8B7",
              fontFamily: CGR,
              fontSize: "16px",
              fontWeight: 700,
              padding: "15px 32px",
              borderRadius: "4px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
            >
              Download All Transcripts (.ZIP) &#x2193;
            </a>
          </div>
        </section>
      )}

      {/* ── Tab 2: Research & Publications ── */}
      {tab === "research" && (
        <section style={{
          backgroundColor: amber,
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          padding: "80px 48px",
        }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{
              fontFamily: CGR,
              fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
              fontWeight: 600,
              color: textDark,
              marginBottom: "40px",
              letterSpacing: "0.01em",
            }}>
              Dissertation
            </h2>
            <p style={{
              fontFamily: CGR,
              fontSize: "clamp(1.4rem, 2.8vw, 2rem)",
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.45,
              color: textDark,
              marginBottom: "56px",
            }}>
              A phenomenological study exploring experiences of civic participation among older African Americans and Latinx immigrants using an intersectional life course perspective.
            </p>
            <a
              href="https://drive.google.com/drive/folders/1XjqtXjeFt67TxoLAPQOAN3pgJcsYX_f9?usp=share_link"
              target="_blank"
              rel="noopener noreferrer"
              style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: darkBtn,
              color: "#E7D8B7",
              fontFamily: CGR,
              fontSize: "16px",
              fontWeight: 700,
              padding: "15px 32px",
              borderRadius: "4px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
            >
              Download Full Dissertation (PDF) &#x2193;
            </a>
          </div>
        </section>
      )}

      {/* ── Tab 3: Research Methodology ── */}
      {tab === "methodology" && (
        <>
          <section style={{ backgroundColor: "var(--brand-amber)" }} className="py-20 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div style={{ color: "var(--brand-cream)" }}>
                <h1 style={{ fontFamily: "var(--font-serif)", color: "rgb(0, 0, 0)" }}
                  className="text-5xl font-semibold mb-8 leading-tight">
                  Participants
                </h1>
                <p className="text-base leading-relaxed mb-6 opacity-90" style={{ color: "rgb(0, 0, 0)" }}>
                  African Americans and Latinx adults (age 60+) living in California, New Jersey and New York shared their
                  experiences of participating in their communities throughout their lives. In addition, they shared
                  stories of the ways they contributed to the well-being of their communities during COVID-19, Black
                  Lives Matter in 2020, and through personal life transitions of immigration and changes to their
                  health and physical abilities.
                </p>
                <p className="text-base leading-relaxed opacity-90" style={{ color: "rgb(0, 0, 0)" }}>
                  Stories are presented in participants' native language. Most African American participants were born
                  in the North East where they currently reside, except a few born in the South and the Midwest.
                  Latinx participants' stories include experiences from their countries of origin; Mexico, El Salvador,
                  Guatemala, Colombia, Ecuador, Puerto Rico y Peru.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 -rotate-1 rounded"
                  style={{ backgroundColor: "var(--brand-amber)", opacity: 0.15 }} />
                <img src={heroImg} alt="Community members marching together"
                  className="w-full object-cover rounded relative" style={{ filter: "contrast(1.05)" }} />
              </div>
            </div>
          </section>

          <section style={{
            backgroundColor: amber,
            minHeight: "70vh",
            padding: "72px 48px 96px",
          }}>
          <article style={{ maxWidth: "900px", margin: "0 auto", color: textDark }}>
            <header style={{
              textAlign: "center",
              paddingBottom: "40px",
              marginBottom: "48px",
              borderBottom: "1px solid rgba(35,31,32,0.24)",
            }}>
              <p style={{
                fontFamily: CGR,
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "12px",
                opacity: 0.65,
              }}>
                Study Overview
              </p>
              <h2 style={{
                fontFamily: CGR,
                fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                fontWeight: 600,
                lineHeight: 1,
                margin: 0,
              }}>
                Research Methodology
              </h2>
            </header>

            {[
              {
                title: "Background and Aims",
                paragraphs: [
                  "In the past 20 years, scholars, practitioners, and policy makers have expressed great interest and commitment to increasing older adults’ civic participation. Empirical research has found various health, economic, and social benefits for individuals who volunteer in later life and for society overall. However, there are major gaps in this literature, especially concerning civic participation among diverse populations of older adults in the U.S. First, few studies have explored civic participation beyond formal volunteerism and voting. Second, there is a dearth of literature examining the experiences of civic participation among non-White older adults, particularly African Americans and Latinx immigrants, who will constitute the largest non-White groups of older adults by 2030.",
                  "Finally, the literature has failed to account for the socio-political context and structures of oppression that shape experiences of civic participation. Guided by intersectional life course theory to attend to these gaps, I set out to examine the research questions, “How do Latinx and African American older adults experience civic participation throughout the life course in the context of intersectional identities (i.e., race/ethnicity, age, gender, culture) and major life transitions (i.e., acquiring chronic health problem, immigration)?”; and “How are these experiences similar or different between African Americans and Latinx older adults?”",
                ],
              },
              {
                title: "Methods",
                paragraphs: [
                  "I conducted a phenomenological study with 17 African Americans and Latinx adults (ages 60 and older) living in New Jersey and New York. Each participant engaged in an in-depth interview, followed by an optional document elicitation, then an oral history interview to explore experiences of civic participation across the life course. I drew from intersectional life course perspective and hermeneutic phenomenology to guide the design and analysis and to contextualize participants’ experience across the life course and within historical and the current socio-political space in which they live and participate.",
                  "All data was collected, transcribed, and uploaded into Nvivo12. Data were bilingual (Spanish/English) and not translated for analysis. To analyze results, I first crafted narratives from the two interviews—a process of developing narratives from transcripts to gain a deeper understanding of the phenomenon. In this case, it also helped to organize experiences across life stages and track the progression of the phenomenon alongside age, politics, and major life experiences (immigration, death, pandemics, illness diagnosis, etc.). This analytical process was complemented by an Interpretative Phenomenological Analysis (IPA), which prioritizes (a) diversity of lived experience, (b) context, and (c) relationship to life narratives.",
                ],
              },
              {
                title: "Results",
                paragraphs: [
                  "Four themes emerged that provide a nuanced understanding of experiences of civic participation among older African Americans and Latinx immigrants. The first theme, geopolitical and socio-historical context, situates when, how, and why participants began to participate; how their participation developed across their lives and within community, social structures, culture, and politics; and how such systems produce the context for these activities to emerge. The second theme, the role of age/ageism, health/illness stigma, and race/racism in civic participation shows how interaction across social categories and systems of oppression affect participants’ decision of how, where, and with whom to engage in civic activities. The third theme, agency and resistance, demonstrates how African American and Latinx adults develop their own opportunities and capacity for civic participation in the context of hostile and neglectful social structures and governance. The final theme, linked lives, captures the values of compassion and connectedness. This theme reveals how social, cultural, and religious systems influence individuals' sense of interconnectedness, allowing them to engage across generations, international borders, and history.",
                ],
              },
              {
                title: "Discussion",
                paragraphs: [
                  "This dissertation contributes new insights on the multidimensionality of civic participation, including dimensions of spirituality, solidarity, survival, and empowerment. In addition, it presents evidence on the dynamics and experiences of civic participation across the life course in the context of geopolitical and socio-historical contexts. It also presents an opportunity to question processes of inclusion in “civic” participation among historically excluded populations, whose citizenship has, and continues to be, in question. Furthermore, this dissertation provides an example of the application of methodological and theoretical approaches that are underutilized in later life civic participation research and that have great potential for contributing to anti-oppressive research with marginalized populations.",
                  "In addition, this theoretical and methodological approach gave way to results that demonstrate the richness, complexity, and essence of civic participation in the spectrum of time and space. Findings from this study could improve conceptualizations and measurements of civic participation for future studies, policy, and social and health initiatives. Particularly, it further demonstrates the grave limitations of predominant social gerontological frameworks on later life civic participation (e.g., productive aging) and calls for re-conceptualizing civic participation in ways that center the lived experiences and historical socio-political struggles of ethno-racially underrepresented populations.",
                ],
              },
            ].map((section, index) => (
              <section
                key={section.title}
                className="methodology-section"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 0.36fr) minmax(0, 1fr)",
                  gap: "48px",
                  paddingBottom: index === 3 ? 0 : "52px",
                  marginBottom: index === 3 ? 0 : "52px",
                  borderBottom: index === 3 ? "none" : "1px solid rgba(35,31,32,0.18)",
                }}
              >
                <h3 style={{
                  fontFamily: CGR,
                  fontSize: "clamp(1.7rem, 3vw, 2.25rem)",
                  fontWeight: 600,
                  lineHeight: 1.1,
                  margin: 0,
                }}>
                  {section.title}
                </h3>
                <div>
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      style={{
                        fontFamily: CGR,
                        fontSize: "19px",
                        lineHeight: 1.75,
                        margin: "0 0 24px",
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
          </section>
        </>
      )}

      <SiteFooter />
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<"home" | "bmnj" | "researchers" | "collection">("home");
  const [activeCollection, setActiveCollection] = useState<CollectionKey>("latine");

  const handleNav = (link: string) => {
    window.scrollTo(0, 0);
    if (link === "For Research") setPage("researchers");
    else setPage("home");
  };

  const openCollection = (collection: CollectionKey) => {
    runArchiveTransition(
      () => {
        setActiveCollection(collection);
        setPage("collection");
      },
      "forward",
      () => window.scrollTo(0, 0),
    );
  };

  const returnToShelf = () => {
    runArchiveTransition(
      () => setPage("home"),
      "back",
      () => document.getElementById("archive-shelf")?.scrollIntoView({ block: "start" }),
    );
  };

  if (page === "bmnj") {
    return <BmnjStoryPage onBack={() => { setPage("home"); window.scrollTo(0, 0); }} />;
  }
  if (page === "researchers") {
    return <ResearchersPage onNav={handleNav} />;
  }
  if (page === "collection") {
    return (
      <CollectionArchivePage
        collection={activeCollection}
        onBack={returnToShelf}
        onNav={handleNav}
        onOpenStory={() => { setPage("bmnj"); window.scrollTo(0, 0); }}
      />
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <SplashScreen />
      <SiteHeader onNav={handleNav} activePage="Participants" />

      {/* ── Digital Archive Exhibition ── */}
      <section id="archive-shelf" style={{
        backgroundColor: "#F6F4EE",
        padding: "72px 0 0",
        overflow: "hidden",
      }}>
        <div className="w-full px-6 lg:px-24">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "40px",
              fontWeight: 700,
              color: "#2C1B14",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}>
              Explore Collections
            </h2>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: "18px",
              color: "#5A564F",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: "520px",
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              Select an archival volume below to read living community histories.
            </p>
          </div>

          {/* Shelf + Books */}
          <div style={{ width: "100%", position: "relative" }}>
          {/* Books row — aligned to sit on the shelf */}
          <div
            className="flex flex-col items-center md:flex-row md:items-end"
            style={{
              justifyContent: "space-between",
              gap: "clamp(20px, 3vw, 56px)",
              paddingBottom: 0,
              position: "relative",
              zIndex: 2,
            }}
          >
            <ArchiveVolume
              volumeTag="Volume I"
              title="Latine Immigrant Stories"
              description="Oral histories of migration, solidarity, and neighborhood mutual aid."
              coverColor="#843420"
              img="https://images.unsplash.com/photo-1759411353705-6149080584b3?w=700&h=380&fit=crop&auto=format"
              imgAlt="Archival documentary photo of community workers and organizers"
              defaultActive={true}
              showVolumeTag={false}
              onOpen={() => openCollection("latine")}
              heroLayerName={collectionPages.latine.book.heroLayerName}
              layerName={collectionPages.latine.book.layerName}
              imageLayerName={collectionPages.latine.book.imageLayerName}
              titleLayerName={collectionPages.latine.book.titleLayerName}
              transitionName={collectionPages.latine.book.transitionName}
            />
            <ArchiveVolume
              volumeTag="Volume II"
              title="African American Stories"
              description="Civil rights organizing, Harlem living memory, and generational service."
              coverColor="#1D242E"
              img="https://images.unsplash.com/photo-1576568699714-a3f4950805d5?w=700&h=380&fit=crop&auto=format"
              imgAlt="Civil rights march photograph, Library of Congress"
              showVolumeTag={false}
              onOpen={() => openCollection("africanAmerican")}
              heroLayerName={collectionPages.africanAmerican.book.heroLayerName}
              layerName={collectionPages.africanAmerican.book.layerName}
              imageLayerName={collectionPages.africanAmerican.book.imageLayerName}
              titleLayerName={collectionPages.africanAmerican.book.titleLayerName}
              transitionName={collectionPages.africanAmerican.book.transitionName}
            />
            <ArchiveVolume
              volumeTag="Volume III"
              title="Chinese Immigrant Stories"
              description="Labor history, displacement resilience, and Chinatown mutual aid."
              coverColor="#2A3A32"
              img="https://images.unsplash.com/photo-1758547083647-e66dc420f28a?w=700&h=380&fit=crop&auto=format"
              imgAlt="Historic Chinatown street scene, black and white"
              showVolumeTag={false}
              onOpen={() => openCollection("chinese")}
              heroLayerName={collectionPages.chinese.book.heroLayerName}
              layerName={collectionPages.chinese.book.layerName}
              imageLayerName={collectionPages.chinese.book.imageLayerName}
              titleLayerName={collectionPages.chinese.book.titleLayerName}
              transitionName={collectionPages.chinese.book.transitionName}
            />
          </div>

          {/* Architectural display ledge */}
          <div style={{ position: "relative", zIndex: 3 }}>
            {/* Ledge top surface — walnut */}
            <div style={{
              height: "16px",
              background: "linear-gradient(to bottom, #5C3420 0%, #382215 55%, #231208 100%)",
              borderRadius: "2px 2px 0 0",
              boxShadow: "inset 0 3px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)",
            }} />
            {/* Brass inlay front trim */}
            <div style={{
              height: "3px",
              background: "linear-gradient(to bottom, #E0C070 0%, #C5A059 50%, #A07830 100%)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }} />
            {/* Ledge body */}
            <div style={{
              height: "28px",
              background: "linear-gradient(to bottom, #382215 0%, #231208 100%)",
              backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 48px)",
            }} />
            {/* Contact shadow on wall below ledge */}
            <div style={{
              height: "48px",
              background: "linear-gradient(to bottom, rgba(20,8,2,0.32) 0%, rgba(20,8,2,0.07) 55%, transparent 100%)",
            }} />
          </div>
        </div>
        </div>
      </section>

      {/* ── Section label ── */}
      <div style={{ background: "linear-gradient(to bottom, var(--brand-amber) 0%, #8B5A1A 100%)" }}
        className="px-6 pt-14 pb-4">
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "var(--brand-dark)", fontFamily: "var(--font-sans)" }}
            className="text-xs font-semibold tracking-widest uppercase opacity-70">
            Story Cards — Participants
          </p>
          <h2 style={{ fontFamily: "var(--font-serif)", color: "var(--brand-dark)" }}
            className="text-3xl font-semibold mt-1">
            Their Words. Their Lives.
          </h2>
        </div>
      </div>

      {/* ── Story Cards Grid ── */}
      <section style={{ background: "linear-gradient(to bottom, #8B5A1A 0%, var(--brand-dark) 100%)" }}
        className="px-6 py-10 pb-20">
        <div className="max-w-7xl mx-auto" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
        }}>
          {participants.map((p) => (
            <a
              key={p.id}
              href="#"
              onClick={p.hasStory ? (e) => { e.preventDefault(); setPage("bmnj"); } : undefined}
              className="story-card block rounded-xl overflow-hidden no-underline"
              style={{
                backgroundColor: "var(--brand-card)",
                border: "1px solid var(--brand-border)",
                textDecoration: "none",
                cursor: p.hasStory ? "pointer" : "default",
              }}
            >
              {/* Portrait */}
              <div className="relative overflow-hidden" style={{ paddingTop: "70%" }}>
                <img
                  src={p.photo}
                  alt={`Portrait for participant ${p.id}`}
                  className="story-card-portrait absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: p.id === "BMNJ" ? "center center" : "center" }}
                />
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(91,37,9,0.6) 0%, transparent 50%)" }} />
                <span className="absolute bottom-2 left-2 font-semibold px-2 py-0.5 rounded"
                  style={{
                    fontSize: "0.65rem",
                    backgroundColor: "rgba(91,37,9,0.88)",
                    color: "var(--brand-cream)",
                    backdropFilter: "blur(4px)",
                    letterSpacing: "0.12em",
                  }}>
                  {p.id}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col justify-between" style={{ minHeight: "140px" }}>
                <div>
                  <span style={{
                    fontFamily: "var(--font-serif)", color: "var(--brand-amber)",
                    fontSize: "2rem", lineHeight: "0.8", display: "block", marginBottom: "4px",
                  }}>"</span>
                  <p style={{
                    fontFamily: "var(--font-serif)", color: "var(--brand-dark)",
                    fontSize: "0.85rem", lineHeight: "1.55", fontStyle: "italic",
                  }}>
                    {p.quote}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3"
                  style={{ borderTop: "1px solid var(--brand-border)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--brand-dark)", opacity: 0.6 }}>
                    {p.location}
                  </span>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    color: p.hasStory ? "var(--brand-red)" : "var(--brand-dark)",
                    opacity: p.hasStory ? 1 : 0.35,
                  }}>
                    {p.hasStory ? "Read Story →" : "Coming soon"}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
