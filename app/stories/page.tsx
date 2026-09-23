import type { Metadata } from "next";

export const metadata: Metadata = { title: "Participants" };

export default function StoriesPage() {
  return (
    <>
      <section className="archiveHero">
        <div className="container archiveHeroSplit">
          <div className="archiveHeroCopy">
            <h1 className="archiveTitle">Participants</h1>
            <p className="archiveLede">
              African Americans and Latinx adults (age 60+) living in California, New Jersey and New
              York shared their experiences of participating in their communities throughout their
              lives. In addition, they shared stories of the ways they contributed to the well-being of
              their communities during COVID-19, Black Lives Matter in 2020, and through personal life
              transitions of immigration and changes to their health and physical abilities.
            </p>
            <p className="archiveLede">
              Stories are presented in participants’ native language. Most African American participants
              were born in the North East where they currently reside, except a few born in the South
              and the Midwest. Latinx participants’ stories include experiences from their countries of
              origin; Mexico, El Salvador, Guatemala, Colombia, Ecuador, Puerto Rico y Peru.
            </p>
          </div>
          <figure className="archivePhotoFrame">
            <div
              className="archivePhoto"
              role="img"
              aria-label="Placeholder for a documentary photograph from the archive. A verified image can be added here later."
            />
          </figure>
        </div>
      </section>
      <div className="goldBar" aria-hidden="true" />

      <section className="paperBand">
        <div className="container collections">
          {[
            ["Latine Immigrant Stories", "Stories from Latine immigrant participants."],
            ["African American Stories", "Stories from African American older adults."],
            ["Chinese Immigrant Stories", "Stories from Chinese immigrant participants."],
          ].map(([title, desc]) => (
            <article className="collectionCard" key={title}>
              <span>Collection</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
