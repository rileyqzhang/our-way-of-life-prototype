import type { SurveyAnswer, SurveyConfig, SurveyFile } from "@/lib/survey/types";

export type StoredSubmission = {
  _id: string;
  _type: "storySubmission";
  status: "pending";
  publicationAuthorized: false;
  submittedAt: string;
  surveyId: string;
  surveyVersion: number;
  language: "en" | "es" | "zh";
  answers: SurveyAnswer[];
  files: { key: string; filename: string; contentType: string; byteLength: number }[];
};

export function submissionDocument(input: {
  idempotencyKey: string;
  survey: SurveyConfig;
  language: "en" | "es" | "zh";
  answers: SurveyAnswer[];
  files: SurveyFile[];
  submittedAt?: string;
}): StoredSubmission {
  return {
    _id: `drafts.storySubmission-${input.idempotencyKey}`,
    _type: "storySubmission",
    status: "pending",
    publicationAuthorized: false,
    submittedAt: input.submittedAt || new Date().toISOString(),
    surveyId: input.survey.id,
    surveyVersion: input.survey.version,
    language: input.language,
    answers: input.answers,
    files: input.files.map((file) => ({
      key: file.key,
      filename: file.filename,
      contentType: file.contentType,
      byteLength: file.byteLength,
    })),
  };
}

export function storyDraftFromSubmission(doc: {
  status?: string;
  publicationAuthorized?: boolean;
  participantCode?: string;
  language?: string;
  answers?: SurveyAnswer[];
  _id?: string;
}) {
  if (doc.status !== "approved" || doc.publicationAuthorized !== true) {
    return { ok: false as const, reason: "not_authorized" as const };
  }
  const code = doc.participantCode?.trim() || "";
  if (!code) return { ok: false as const, reason: "missing_code" as const };
  const slug = code
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return { ok: false as const, reason: "missing_code" as const };
  const language = doc.language === "es" || doc.language === "zh" ? doc.language : "en";
  const narrative = (doc.answers || [])
    .filter((answer) => answer.includeInStory && answer.value.trim())
    .map((answer) => `${answer.label}\n${answer.value.trim()}`)
    .join("\n\n");
  const submissionKey = doc._id?.replace(/^drafts\.storySubmission-/, "") || slug;
  return {
    ok: true as const,
    document: {
      _id: `drafts.story-from-${submissionKey}`,
      _type: "story" as const,
      participantCode: code,
      slug: { _type: "slug" as const, current: `submission-${slug}` },
      title: { en: code, es: code, zh: code },
      body: { en: language === "en" ? narrative : "", es: language === "es" ? narrative : "", zh: language === "zh" ? narrative : "" },
      published: false,
    },
  };
}
