import { legacySurvey } from "@/lib/survey/legacy";
import type { SurveyConfig, SurveyGroup, SurveyQuestion, SurveyQuestionType, SurveyText } from "@/lib/survey/types";

const QUESTION_TYPES = new Set<SurveyQuestionType>(["text", "email", "textarea", "select", "radio", "file", "section"]);
const GROUPS = new Set<SurveyGroup>(["basic", "creative", "prompt"]);

type RawQuestion = {
  key?: string;
  type?: string;
  group?: string;
  required?: boolean;
  label?: SurveyText;
  description?: SurveyText;
  placeholder?: SurveyText;
  accept?: string;
  options?: { value?: string; label?: SurveyText }[];
};

export type RawSurvey = {
  version?: number;
  title?: SurveyText;
  introduction?: SurveyText;
  submitNote?: SurveyText;
  confirmationTitle?: SurveyText;
  confirmationBody?: SurveyText;
  questions?: RawQuestion[];
};

function text(value: SurveyText | undefined, fallback: SurveyText): SurveyText {
  if (!value || (!value.en && !value.es && !value.zh)) return fallback;
  return { en: value.en || fallback.en, es: value.es || fallback.es, zh: value.zh || fallback.zh };
}

function mapQuestion(raw: RawQuestion): SurveyQuestion | null {
  const type = QUESTION_TYPES.has(raw.type as SurveyQuestionType) ? (raw.type as SurveyQuestionType) : null;
  const key = raw.key?.trim();
  if (!type || !key) return null;
  const group = GROUPS.has(raw.group as SurveyGroup) ? (raw.group as SurveyGroup) : type === "section" ? "prompt" : "prompt";
  return {
    key,
    type,
    group,
    required: raw.required === true && type !== "section",
    label: raw.label || { en: key },
    description: raw.description,
    placeholder: raw.placeholder,
    accept: raw.accept,
    options: raw.options
      ?.filter((option) => option.value?.trim())
      .map((option) => ({ value: option.value!.trim(), label: option.label || { en: option.value!.trim() } })),
  };
}

export function resolveSurvey(published: RawSurvey | null | undefined) {
  const questions = published?.questions?.map(mapQuestion).filter((question): question is SurveyQuestion => Boolean(question)) || [];
  if (!published || questions.length === 0) return { survey: legacySurvey, source: "recovered" as const };
  const survey: SurveyConfig = {
    id: legacySurvey.id,
    version: typeof published.version === "number" && published.version > 0 ? published.version : legacySurvey.version,
    title: text(published.title, legacySurvey.title),
    introduction: text(published.introduction, legacySurvey.introduction),
    submitNote: text(published.submitNote, legacySurvey.submitNote),
    confirmationTitle: text(published.confirmationTitle, legacySurvey.confirmationTitle),
    confirmationBody: text(published.confirmationBody, legacySurvey.confirmationBody),
    questions,
  };
  return { survey, source: "published" as const };
}
