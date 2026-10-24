export type SurveyLanguage = "en" | "es" | "zh";

export type SurveyText = { en?: string; es?: string; zh?: string };

export type SurveyQuestionType = "text" | "email" | "textarea" | "select" | "radio" | "file" | "section";

export type SurveyGroup = "basic" | "creative" | "prompt";

export type SurveyOption = {
  value: string;
  label: SurveyText;
};

export type SurveyQuestion = {
  key: string;
  type: SurveyQuestionType;
  group: SurveyGroup;
  required: boolean;
  label: SurveyText;
  description?: SurveyText;
  placeholder?: SurveyText;
  accept?: string;
  options?: SurveyOption[];
};

export type SurveyConfig = {
  id: string;
  version: number;
  title: SurveyText;
  introduction: SurveyText;
  submitNote: SurveyText;
  confirmationTitle: SurveyText;
  confirmationBody: SurveyText;
  questions: SurveyQuestion[];
};

export type SurveyAnswer = {
  key: string;
  label: string;
  value: string;
  includeInStory: boolean;
};

export type SurveyFile = {
  key: string;
  filename: string;
  contentType: string;
  byteLength: number;
  dataBase64?: string;
};

export type SurveySubmissionInput = {
  answers?: Record<string, unknown>;
  files?: SurveyFile[];
  website?: unknown;
  startedAt?: unknown;
  language?: unknown;
  idempotencyKey?: unknown;
};
