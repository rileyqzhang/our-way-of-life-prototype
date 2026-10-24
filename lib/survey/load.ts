import { client } from "@/lib/sanity/client";
import { legacySurvey } from "@/lib/survey/legacy";
import { resolveSurvey, type RawSurvey } from "@/lib/survey/resolve";

const surveyQuery = `*[_id == "shareYourStorySurvey" && _type == "survey"][0]{
  version,
  title,
  introduction,
  submitNote,
  confirmationTitle,
  confirmationBody,
  questions[]{
    key,
    type,
    group,
    required,
    label,
    description,
    placeholder,
    accept,
    options[]{ value, label }
  }
}`;

export async function getShareSurvey() {
  if (!client) return { survey: legacySurvey, source: "recovered" as const };
  try {
    const published = await client.fetch<RawSurvey | null>(surveyQuery);
    return resolveSurvey(published);
  } catch {
    return { survey: legacySurvey, source: "recovered" as const };
  }
}
