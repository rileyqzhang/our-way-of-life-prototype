import type { Metadata } from "next";
import { SurveyForm } from "@/components/share-your-story/SurveyForm";
import { ui } from "@/lib/content/copy";
import { type Locale } from "@/lib/i18n";
import { readLang } from "@/lib/i18n/request";
import { getShareSurvey } from "@/lib/survey/load";
import { surveyText } from "@/lib/survey/text";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await readLang(params);
  return { title: ui[lang].share.title };
}

export default async function ShareYourStoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await readLang(params);
  const { survey } = await getShareSurvey();
  const intakeOpen = process.env.SURVEY_INTAKE_ENABLED === "true";

  return (
    <div className="surveyPage">
      <div className="surveySheet">
        <h1>{surveyText(survey.title, lang)}</h1>
        <p className="surveyIntro">{surveyText(survey.introduction, lang)}</p>
        <SurveyForm survey={survey} lang={lang as Locale} intakeOpen={intakeOpen} />
      </div>
    </div>
  );
}
