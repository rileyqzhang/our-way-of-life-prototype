import type { Metadata } from "next";
import Link from "next/link";
import { ui } from "@/lib/content/copy";
import { localizeHref } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].share.title };
}

export default async function ShareYourStoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const copy = ui[lang];

  return (
    <div className="archivePage">
      <section className="archiveHero">
        <div className="container archiveHeroInner">
          <div className="archiveHeroCopy">
            <h1 className="archiveTitle">{copy.share.title}</h1>
            <p className="archiveLede">{copy.share.pausedBody}</p>
          </div>
        </div>
      </section>
      <div className="goldBar" aria-hidden="true" />
      <section className="paperBand">
        <div className="container storyFormPanel">
          <div className="reviewNotice" role="status">
            <h2>{copy.share.pausedTitle}</h2>
            <p>{copy.share.pausedBody}</p>
            <p>
              <Link className="button" href={localizeHref(lang, "/stories")}>
                {copy.share.browse}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
