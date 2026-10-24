import type { SurveyConfig, SurveyQuestion } from "@/lib/survey/types";

export function surveySteps(questions: SurveyQuestion[]) {
  const steps: SurveyQuestion[][] = [];
  let basic: SurveyQuestion[] = [];
  let creative: SurveyQuestion[] = [];

  const flush = () => {
    if (basic.length) {
      steps.push(basic);
      basic = [];
    }
    if (creative.length) {
      steps.push(creative);
      creative = [];
    }
  };

  for (const question of questions) {
    if (question.type === "section") {
      flush();
      steps.push([question]);
      continue;
    }
    if (question.group === "basic") {
      if (creative.length) flush();
      basic.push(question);
      continue;
    }
    if (question.group === "creative") {
      if (basic.length) {
        steps.push(basic);
        basic = [];
      }
      creative.push(question);
      continue;
    }
    flush();
    steps.push([question]);
  }
  flush();
  return steps;
}

export function stepIsRequired(step: SurveyQuestion[]) {
  return step.some((question) => question.required && question.type !== "section");
}

export function allowsAudio(question: SurveyQuestion) {
  return question.type === "textarea" && question.group === "prompt";
}
