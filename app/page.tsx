import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">Community life stories · visual art · oral history</p>
          <h1 className="display">Our Way of Life Archive</h1>
          <p className="lede">Amplifying the lifelong work of Latine immigrants, Chinese immigrants, and African American older adults through visual art and storytelling.</p>
          <div className="heroActions">
            <Link className="button" href="/stories">Explore Stories</Link>
            <Link className="button secondary" href="/share-your-story">Share Your Story</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container widePanel twoCol">
          <div>
            <p className="eyebrow">Featured Story</p>
            <h2 className="sectionTitle">A living archive of memory and participation.</h2>
            <div className="rule" />
            <p className="prose">This custom build keeps the archive visually open and horizontal while leaving story content easy to migrate into a CMS later.</p>
            <div className="heroActions" style={{justifyContent:"flex-start"}}>
              <Link className="button" href="/stories">Browse the archive</Link>
            </div>
          </div>
          <div className="archiveArt" aria-hidden="true" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">Collections</p>
          <h2 className="sectionTitle">Explore by community</h2>
          <div className="collections">
            {[
              ["Latine", "Latine Immigrant Stories"],
              ["African American", "African American Stories"],
              ["Chinese", "Chinese Immigrant Stories"],
            ].map(([label, title]) => (
              <Link className="collectionCard" href="/stories" key={title}>
                <span>{label}</span>
                <h3>{title}</h3>
                <p>View stories and themes →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container callout">
          <p className="eyebrow">Interactive Timeline</p>
          <h2>Place stories in historical context.</h2>
          <p>Laws, migrations, and movements sit beside the stories participants told about living through them.</p>
          <Link className="button" href="/timeline">Open Timeline</Link>
        </div>
      </section>
    </>
  );
}
