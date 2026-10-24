import type { Metadata } from "next";
import { InteractiveTimeline } from "@/components/timeline/InteractiveTimeline";
import { getArchive } from "@/lib/content/get-content";
import { readLang } from "@/lib/i18n/request";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  const title = { en: "Interactive Timeline", es: "Línea de tiempo interactiva", zh: "互动时间线" }[lang];
  const description = {
    en: "Historical events and participant stories from the Our Way of Life Archive, in English, Spanish, and Chinese.",
    es: "Acontecimientos históricos e historias de participantes del archivo Our Way of Life, en inglés, español y chino.",
    zh: "我们的生活方式档案中的历史事件与参与者故事，提供英文、西班牙文和中文。",
  }[lang];
  return { title, description };
}

export default async function TimelinePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const archive = await getArchive();
  return <InteractiveTimeline events={archive.timeline} lang={lang} />;
}
