import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST } from "../../app/api/stories/submit/route";
import { storyDraftFromSubmission, submissionDocument } from "./documents";
import { handleSurveySubmission } from "./handle";
import { legacySurvey } from "./legacy";
import { buildReviewNotice, notificationConfig } from "./notify";
import { allowSubmission, resetSubmissionRateLimit } from "./rate-limit";
import { resolveSurvey } from "./resolve";
import { surveySteps } from "./steps";
import { surveyText } from "./text";
import { validateSurveySubmission } from "./validate";

const KEY = "11111111-1111-4111-8111-111111111111";
const NOW = 10_000;

function answers(extra: Record<string, string> = {}) {
  const values: Record<string, string> = {};
  for (const question of legacySurvey.questions) {
    if (!question.required) continue;
    if (question.type === "email") values[question.key] = "synthetic@example.com";
    else if (question.type === "select") values[question.key] = "Elementary";
    else if (question.type === "radio") values[question.key] = "Yes";
    else values[question.key] = "synthetic";
  }
  return { ...values, ...extra };
}

function input(extra: Record<string, unknown> = {}) {
  return {
    answers: answers({ "civic-contribution": "A synthetic community answer." }),
    website: "",
    startedAt: 1_000,
    language: "en",
    idempotencyKey: KEY,
    ...extra,
  };
}

test("recovered survey keeps the legacy questions and translations", () => {
  assert.deepEqual(
    legacySurvey.questions.map((question) => question.key),
    ["age", "gender", "race-ethnicity", "country", "language-spoken", "years-us", "years-city", "education", "voted", "volunteer", "health", "email", "creative-work", "creative-file", "civic-contribution", "early-life", "first-helping", "influences", "identity-civic", "civic-meaning", "community-support"],
  );
  const age = legacySurvey.questions.find((question) => question.key === "age");
  assert.equal(surveyText(age?.label, "es"), "Edad:");
  assert.equal(surveyText(age?.label, "zh"), "年龄：");
  assert.equal(legacySurvey.questions.find((question) => question.key === "health")?.required, true);
  assert.equal(legacySurvey.questions.find((question) => question.key === "civic-contribution")?.required, false);
});

test("basic fields are required and story prompts can be skipped", () => {
  const missing = validateSurveySubmission(legacySurvey, { ...input(), answers: { email: "synthetic@example.com" } }, NOW);
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((error) => error.key === "age" && error.message === "required"));
  const valid = validateSurveySubmission(legacySurvey, input(), NOW);
  assert.equal(valid.ok, true);
  assert.equal(valid.answers.find((answer) => answer.key === "health")?.includeInStory, false);
  assert.equal(valid.answers.find((answer) => answer.key === "civic-contribution")?.includeInStory, true);
});

test("server validation rejects a bad email, an unknown choice, and an unknown question", () => {
  const badEmail = validateSurveySubmission(legacySurvey, input({ answers: answers({ email: "not-an-email" }) }), NOW);
  assert.ok(badEmail.errors.some((error) => error.key === "email"));
  const badChoice = validateSurveySubmission(legacySurvey, input({ answers: answers({ education: "Doctorate" }) }), NOW);
  assert.ok(badChoice.errors.some((error) => error.key === "education" && error.message === "option"));
  const unknown = validateSurveySubmission(legacySurvey, input({ answers: { ...answers(), invented: "no" } }), NOW);
  assert.ok(unknown.errors.some((error) => error.key === "invented"));
});

test("spam signals are rejected before storage", async () => {
  let stored = 0;
  const honeypot = await handleSurveySubmission(input({ website: "https://spam.example" }), {
    survey: legacySurvey,
    intakeEnabled: true,
    ip: "honeypot",
    now: NOW,
    store: async () => {
      stored += 1;
      return { id: "nope" };
    },
  });
  assert.equal(honeypot.status, 400);
  assert.equal(stored, 0);
  const fast = await handleSurveySubmission(input({ startedAt: NOW }), {
    survey: legacySurvey,
    intakeEnabled: true,
    ip: "fast",
    now: NOW,
    store: async () => {
      stored += 1;
      return { id: "nope" };
    },
  });
  assert.equal(fast.status, 400);
  assert.equal(stored, 0);
});

test("closed intake does not parse or store, including the public route", async () => {
  let stored = 0;
  const paused = await handleSurveySubmission(input(), {
    survey: legacySurvey,
    intakeEnabled: false,
    ip: "paused",
    now: NOW,
    store: async () => {
      stored += 1;
      return { id: "nope" };
    },
  });
  assert.equal(paused.status, 403);
  assert.equal(stored, 0);

  const previous = process.env.SURVEY_INTAKE_ENABLED;
  delete process.env.SURVEY_INTAKE_ENABLED;
  const response = await POST(new Request("http://localhost/api/stories/submit", { method: "POST", body: "{" }));
  assert.equal(response.status, 403);
  if (previous === undefined) delete process.env.SURVEY_INTAKE_ENABLED;
  else process.env.SURVEY_INTAKE_ENABLED = previous;
});

test("a valid submission is stored once as an unpublished draft and can be retried with the same id", async () => {
  const saved: string[] = [];
  const store = async (document: { _id: string }) => {
    saved.push(document._id);
    return { id: document._id };
  };
  const first = await handleSurveySubmission(input(), { survey: legacySurvey, intakeEnabled: true, ip: "store-a", now: NOW, store, notify: async () => ({ sent: true }) });
  const second = await handleSurveySubmission(input(), { survey: legacySurvey, intakeEnabled: true, ip: "store-b", now: NOW, store, notify: async () => ({ sent: true }) });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(saved[0], `drafts.storySubmission-${KEY}`);
  assert.equal(saved[0], saved[1]);
  assert.equal((first.body as { published: boolean }).published, false);
});

test("storage failure can be retried and an email failure does not discard the saved draft", async () => {
  let attempts = 0;
  const failing = await handleSurveySubmission(input(), {
    survey: legacySurvey,
    intakeEnabled: true,
    ip: "fail-store",
    now: NOW,
    store: async () => {
      attempts += 1;
      throw new Error("offline");
    },
  });
  assert.equal(failing.status, 500);
  assert.equal((failing.body as { retry: boolean }).retry, true);
  assert.equal(attempts, 1);

  let stored = 0;
  const mailed = await handleSurveySubmission(input(), {
    survey: legacySurvey,
    intakeEnabled: true,
    ip: "fail-mail",
    now: NOW,
    store: async (document) => {
      stored += 1;
      return { id: document._id };
    },
    notify: async () => {
      throw new Error("resend down");
    },
  });
  assert.equal(mailed.status, 200);
  assert.equal(stored, 1);
  assert.equal((mailed.body as { notifyError: boolean }).notifyError, true);
});

test("review email is a link only and stays unsent when Resend is not configured", () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    to: process.env.SURVEY_NOTIFY_TO,
    from: process.env.SURVEY_NOTIFY_FROM,
  };
  delete process.env.RESEND_API_KEY;
  delete process.env.SURVEY_NOTIFY_TO;
  delete process.env.SURVEY_NOTIFY_FROM;
  const notice = buildReviewNotice({ submissionId: `drafts.storySubmission-${KEY}`, reviewUrl: "http://localhost:3000/studio" });
  assert.equal(notice.text.includes("synthetic"), false);
  assert.equal(notice.text.includes("http://localhost:3000/studio"), true);
  assert.equal(notificationConfig().configured, false);
  for (const [name, value] of Object.entries({ RESEND_API_KEY: previous.key, SURVEY_NOTIFY_TO: previous.to, SURVEY_NOTIFY_FROM: previous.from })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("requests are rate limited", () => {
  resetSubmissionRateLimit();
  for (let count = 0; count < 5; count += 1) assert.equal(allowSubmission("203.0.113.5", NOW), true);
  assert.equal(allowSubmission("203.0.113.5", NOW), false);
  assert.equal(allowSubmission("203.0.113.6", NOW), true);
});

test("a published survey replaces the recovered one and a missing document does not", () => {
  assert.equal(resolveSurvey(null).source, "recovered");
  const published = resolveSurvey({
    version: 4,
    questions: [{ key: "custom-prompt", type: "textarea", group: "prompt", required: true, label: { en: "Custom", es: "Personalizada", zh: "自定义" } }],
  });
  assert.equal(published.source, "published");
  assert.equal(published.survey.version, 4);
  assert.deepEqual(published.survey.questions.map((question) => question.key), ["custom-prompt"]);
  assert.equal(surveySteps(published.survey.questions).length, 1);
});

test("an approved submission can become an unpublished story without private demographics", () => {
  const validated = validateSurveySubmission(legacySurvey, input(), NOW);
  const stored = submissionDocument({ idempotencyKey: KEY, survey: legacySurvey, language: "en", answers: validated.answers, files: [] });
  assert.equal(stored._id.startsWith("drafts."), true);
  assert.equal(stored.publicationAuthorized, false);
  const blocked = storyDraftFromSubmission(stored);
  assert.equal(blocked.ok, false);
  const draft = storyDraftFromSubmission({ ...stored, status: "approved", publicationAuthorized: true, participantCode: "SYN1" });
  assert.equal(draft.ok, true);
  if (!draft.ok) return;
  assert.equal(draft.document.published, false);
  assert.equal(draft.document._id.startsWith("drafts."), true);
  assert.equal(draft.document.body.en.includes("A synthetic community answer."), true);
  assert.equal(draft.document.body.en.includes("synthetic@example.com"), false);
  assert.equal(draft.document.body.en.includes("Do you have health conditions?"), false);
});

test("public content queries do not read submissions", () => {
  const archiveQuery = readFileSync(new URL("../sanity/queries.ts", import.meta.url), "utf8");
  assert.equal(archiveQuery.includes("storySubmission"), false);
});
