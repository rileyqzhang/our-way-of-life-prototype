import type { SurveyAnswer, SurveyConfig, SurveyFile, SurveySubmissionInput } from "@/lib/survey/types";

export const MAX_TEXT_LENGTH = 8000;
export const MAX_FILE_BYTES = 1_500_000;
export const MIN_ELAPSED_MS = 2_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SurveyValidation = {
  ok: boolean;
  errors: { key: string; message: "required" | "email" | "option" | "too_long" | "unknown" | "file" | "spam" | "incomplete" }[];
  answers: SurveyAnswer[];
  files: SurveyFile[];
  language: "en" | "es" | "zh";
  idempotencyKey: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateSurveySubmission(survey: SurveyConfig, input: SurveySubmissionInput, now = Date.now()): SurveyValidation {
  const errors: SurveyValidation["errors"] = [];
  const idempotencyKey = text(input.idempotencyKey);
  const language = input.language === "es" || input.language === "zh" ? input.language : "en";

  if (text(input.website)) errors.push({ key: "website", message: "spam" });
  const startedAt = typeof input.startedAt === "number" ? input.startedAt : 0;
  if (!startedAt || now - startedAt < MIN_ELAPSED_MS || startedAt > now + 60_000) {
    errors.push({ key: "startedAt", message: "spam" });
  }
  if (!UUID.test(idempotencyKey)) errors.push({ key: "idempotencyKey", message: "incomplete" });

  const rawAnswers = input.answers && typeof input.answers === "object" ? input.answers : {};
  const known = new Set(survey.questions.map((question) => question.key));
  for (const key of Object.keys(rawAnswers)) {
    if (!known.has(key)) errors.push({ key, message: "unknown" });
  }

  const answers: SurveyAnswer[] = [];
  for (const question of survey.questions) {
    if (question.type === "section" || question.type === "file") continue;
    const value = text(rawAnswers[question.key]);
    if (question.required && !value) errors.push({ key: question.key, message: "required" });
    if (value.length > MAX_TEXT_LENGTH) errors.push({ key: question.key, message: "too_long" });
    if (question.type === "email" && value && !EMAIL.test(value)) errors.push({ key: question.key, message: "email" });
    if ((question.type === "select" || question.type === "radio") && value) {
      const allowed = question.options?.some((option) => option.value === value);
      if (!allowed) errors.push({ key: question.key, message: "option" });
    }
    if (!value) continue;
    answers.push({
      key: question.key,
      label: question.label.en || question.key,
      value,
      includeInStory: question.type === "textarea" && question.group !== "basic",
    });
  }

  const files = Array.isArray(input.files) ? input.files : [];
  const accepted: SurveyFile[] = [];
  for (const file of files) {
    if (!file || typeof file.filename !== "string" || typeof file.byteLength !== "number") {
      errors.push({ key: "file", message: "file" });
      continue;
    }
    const audioKey = file.key.endsWith("__audio") ? file.key.slice(0, -"__audio".length) : "";
    const question = survey.questions.find((item) => item.key === file.key && item.type === "file");
    const audioQuestion = survey.questions.find((item) => item.key === audioKey && item.type === "textarea" && item.group === "prompt");
    if (!question && !audioQuestion) errors.push({ key: file.key || "file", message: "unknown" });
    if (file.byteLength > MAX_FILE_BYTES || file.byteLength < 0) errors.push({ key: file.key || "file", message: "file" });
    if (file.dataBase64 && file.dataBase64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 64) {
      errors.push({ key: file.key || "file", message: "file" });
    }
    if (question?.accept === "image/*" && file.contentType && !file.contentType.startsWith("image/")) {
      errors.push({ key: file.key, message: "file" });
    }
    accepted.push(file);
  }

  return { ok: errors.length === 0, errors, answers, files: accepted, language, idempotencyKey };
}
