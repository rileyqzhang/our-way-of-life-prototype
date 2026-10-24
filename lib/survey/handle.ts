import { allowSubmission } from "@/lib/survey/rate-limit";
import { buildReviewNotice, reviewUrlFor, sendReviewNotice } from "@/lib/survey/notify";
import { submissionDocument, type StoredSubmission } from "@/lib/survey/documents";
import type { SurveyConfig, SurveySubmissionInput } from "@/lib/survey/types";
import { validateSurveySubmission } from "@/lib/survey/validate";

const PAUSED = {
  error: "Story submissions are paused until the project privacy review is complete. Do not send stories, photographs, or contact details.",
};

export type SubmissionDeps = {
  survey: SurveyConfig;
  intakeEnabled: boolean;
  ip: string;
  now?: number;
  store?: (document: StoredSubmission, files: SurveySubmissionInput["files"]) => Promise<{ id: string }>;
  notify?: (submissionId: string) => Promise<{ sent: boolean }>;
};

export async function handleSurveySubmission(input: SurveySubmissionInput, deps: SubmissionDeps) {
  if (!deps.intakeEnabled) return { status: 403, body: PAUSED };
  if (!allowSubmission(deps.ip, deps.now)) return { status: 429, body: { error: "Too many submissions from this network. Wait and try again." } };

  const result = validateSurveySubmission(deps.survey, input, deps.now || Date.now());
  if (!result.ok || !result.idempotencyKey) return { status: 400, body: { errors: result.errors } };
  if (!deps.store) return { status: 503, body: { error: "Private submission storage is not configured.", retry: true } };

  const document = submissionDocument({
    idempotencyKey: result.idempotencyKey,
    survey: deps.survey,
    language: result.language,
    answers: result.answers,
    files: result.files,
  });

  let stored: { id: string };
  try {
    stored = await deps.store(document, result.files);
  } catch {
    return { status: 500, body: { error: "The response was not saved. You can retry with the same form.", retry: true } };
  }

  let notified = false;
  let notifyError = false;
  try {
    const notice = deps.notify ? await deps.notify(stored.id) : await sendReviewNotice(buildReviewNotice({ submissionId: stored.id, reviewUrl: reviewUrlFor(stored.id) }));
    notified = notice.sent;
    notifyError = !notice.sent;
  } catch {
    notifyError = true;
  }

  return { status: 200, body: { id: stored.id, notified, notifyError, published: false, filesRetained: false } };
}
