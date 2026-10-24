import type { SurveyLanguage, SurveyText } from "@/lib/survey/types";

export function surveyText(value: SurveyText | undefined, lang: SurveyLanguage) {
  if (!value) return "";
  return value[lang] || value.en || value.es || value.zh || "";
}
