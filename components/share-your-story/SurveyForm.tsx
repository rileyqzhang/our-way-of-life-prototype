"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { chromeText } from "@/lib/survey/chrome";
import { allowsAudio, stepIsRequired, surveySteps } from "@/lib/survey/steps";
import { surveyText } from "@/lib/survey/text";
import type { SurveyConfig, SurveyLanguage, SurveyQuestion } from "@/lib/survey/types";
import { MAX_FILE_BYTES } from "@/lib/survey/validate";

type SpeechSession = {
  continuous: boolean;
  lang: string;
  onresult: (event: { results?: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }> }) => void;
  start: () => void;
  stop: () => void;
};

type Props = {
  survey: SurveyConfig;
  lang: SurveyLanguage;
  intakeOpen: boolean;
};

export function SurveyForm({ survey, lang, intakeOpen }: Props) {
  const steps = useMemo(() => surveySteps(survey.questions), [survey.questions]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "saved-without-email" | "error">("form");
  const [serverError, setServerError] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const formId = useId();
  const step = steps[index] || [];
  const required = stepIsRequired(step);
  const last = index === steps.length - 1;
  const basic = step.some((question) => question.group === "basic");

  useEffect(() => {
    setStartedAt(Date.now());
  }, []);

  function value(question: SurveyQuestion) {
    return answers[question.key] || "";
  }

  function update(key: string, next: string) {
    setAnswers((current) => ({ ...current, [key]: next }));
    setInvalid((current) => current.filter((item) => item !== key));
  }

  function validateStep() {
    const missing = step.filter((question) => question.required && question.type !== "section" && question.type !== "file" && !value(question).trim()).map((question) => question.key);
    setInvalid(missing);
    if (missing[0]) document.getElementById(`${formId}-${missing[0]}`)?.focus();
    return missing.length === 0;
  }

  function go(nextIndex: number, skip: boolean) {
    if (nextIndex > index && required && !skip && !validateStep()) return;
    if (skip && required) return;
    setInvalid([]);
    setIndex(Math.max(0, Math.min(steps.length - 1, nextIndex)));
  }

  async function record(question: SurveyQuestion) {
    const active = recorderRef.current;
    if (active && active.state !== "inactive") {
      active.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFileNote(chromeText("denied", lang));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecording(false);
        setFileNote(`${chromeText("saved", lang)} ${chromeText("fileNotStored", lang)}`);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      const Speech = (window as unknown as { SpeechRecognition?: new () => SpeechSession; webkitSpeechRecognition?: new () => SpeechSession }).SpeechRecognition
        || (window as unknown as { webkitSpeechRecognition?: new () => SpeechSession }).webkitSpeechRecognition;
      if (Speech) {
        const recognition = new Speech();
        recognition.continuous = true;
        recognition.lang = lang === "es" ? "es-ES" : lang === "zh" ? "zh-CN" : "en-US";
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results || [])
            .filter((result) => result.isFinal)
            .map((result) => result[0]?.transcript || "")
            .join(" ")
            .trim();
          if (transcript) update(question.key, `${value(question)} ${transcript}`.trim());
        };
        recognition.start();
        recorder.addEventListener("stop", () => recognition.stop(), { once: true });
      }
    } catch {
      setFileNote(chromeText("denied", lang));
    }
  }

  function onFile(question: SurveyQuestion, file: File | undefined) {
    if (!file) return;
    if (question.accept === "image/*" && !file.type.startsWith("image/")) {
      setFileNote(chromeText("notImage", lang));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileNote(chromeText("fileTooLarge", lang));
      return;
    }
    setFileNote(`${file.name}. ${chromeText("fileNotStored", lang)}`);
  }

  async function submit() {
    if (!intakeOpen) return;
    setConfirming(false);
    setStatus("form");
    setServerError("");
    const website = (document.getElementById(`${formId}-website`) as HTMLInputElement | null)?.value || "";
    const response = await fetch("/api/stories/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        files: [],
        website,
        startedAt,
        language: lang,
        idempotencyKey,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; notifyError?: boolean; retry?: boolean };
    if (response.ok) {
      setStatus(body.notifyError ? "saved-without-email" : "success");
      return;
    }
    setServerError(body.error || chromeText("requiredHint", lang));
    setStatus("error");
  }

  if (status === "success" || status === "saved-without-email") {
    return (
      <div className="formSuccess" role="status">
        <h3>{chromeText("thankYou", lang)}</h3>
        <p>{status === "saved-without-email" ? chromeText("emailFailed", lang) : chromeText("received", lang)}</p>
        <p>{chromeText("reviewed", lang)}</p>
        {fileNote ? <p>{chromeText("fileNotStored", lang)}</p> : null}
      </div>
    );
  }

  return (
    <form className="surveyForm" onSubmit={(event) => event.preventDefault()} noValidate>
      <div className="surveyProgressRow">
        <div className="surveySegments" aria-hidden="true">
          {steps.map((_, stepIndex) => (
            <span key={stepIndex} className={stepIndex < index ? "done" : stepIndex === index ? "active" : ""} />
          ))}
        </div>
        <p className="surveyProgress" aria-live="polite">
          {index + 1} {chromeText("of", lang)} {steps.length}
        </p>
      </div>
      {invalid.length > 0 ? (
        <p className="surveyHint" role="alert">
          {chromeText("requiredHint", lang)}
        </p>
      ) : null}
      {status === "error" ? <p className="surveyHint" role="alert">{serverError}</p> : null}
      <div className="visuallyHidden" aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {basic ? <h2 className="surveyStepTitle">{chromeText("basicTitle", lang)}</h2> : null}
      <div className={basic ? "surveyBasic" : "surveyPromptStep"}>
        {step.map((question) => (
          <QuestionField
            key={question.key}
            formId={formId}
            question={question}
            lang={lang}
            value={value(question)}
            invalid={invalid.includes(question.key)}
            basic={basic}
            onChange={update}
            onFile={onFile}
            onRecord={record}
            recording={recording}
          />
        ))}
      </div>
      {fileNote ? <p className="surveyFileNote" role="status">{fileNote}</p> : null}
      {last ? <p className="surveySubmitNote">{surveyText(survey.submitNote, lang)}</p> : null}
      {!intakeOpen && last ? <p className="surveySubmitNote" role="status">{chromeText("paused", lang)}</p> : null}
      <div className="surveyActions">
        {index > 0 ? (
          <button type="button" className="surveyBack" onClick={() => go(index - 1, false)}>
            {chromeText("back", lang)}
          </button>
        ) : <span />}
        {!last && !required ? (
          <button type="button" className="surveySkip" onClick={() => go(index + 1, true)}>
            {chromeText("skip", lang)}
          </button>
        ) : null}
        {!last ? (
          <button type="button" className="surveyNext" onClick={() => go(index + 1, false)}>
            {chromeText("next", lang)}
          </button>
        ) : null}
        {last && intakeOpen ? (
          <button type="button" className="surveyNext" onClick={() => setConfirming(true)}>
            {chromeText("submit", lang)}
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div className="surveyDialog" role="dialog" aria-modal="true" aria-labelledby={`${formId}-confirm`}>
          <h3 id={`${formId}-confirm`}>{surveyText(survey.confirmationTitle, lang)}</h3>
          <p>{surveyText(survey.confirmationBody, lang)}</p>
          <div className="surveyActions">
            <button type="button" className="surveySkip" onClick={() => setConfirming(false)}>
              {chromeText("cancel", lang)}
            </button>
            <button type="button" className="surveyNext" onClick={submit}>
              {chromeText("confirm", lang)}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function basicSpan(key: string) {
  if (["age", "gender", "race-ethnicity", "years-us", "years-city", "education"].includes(key)) return "surveySpan3";
  if (["country", "language-spoken"].includes(key)) return "surveySpan2";
  return "surveySpan6";
}

function QuestionField({
  formId,
  question,
  lang,
  value,
  invalid,
  basic,
  onChange,
  onFile,
  onRecord,
  recording,
}: {
  formId: string;
  question: SurveyQuestion;
  lang: SurveyLanguage;
  value: string;
  invalid: boolean;
  basic: boolean;
  onChange: (key: string, value: string) => void;
  onFile: (question: SurveyQuestion, file: File | undefined) => void;
  onRecord: (question: SurveyQuestion) => void;
  recording: boolean;
}) {
  const id = `${formId}-${question.key}`;
  const label = surveyText(question.label, lang);
  const description = surveyText(question.description, lang);
  const placeholder = surveyText(question.placeholder, lang) || (question.type === "textarea" ? chromeText("answerPlaceholder", lang) : "");
  const span = basic ? basicSpan(question.key) : "";
  if (question.type === "section") return <h2 className="surveyStepTitle">{label}</h2>;
  if (question.type === "radio") {
    return (
      <fieldset id={id} className={`surveyChoice ${span}${question.key === "voted" ? " surveyDivider" : ""}${invalid ? " surveyInvalid" : ""}`}>
        <legend>{label}</legend>
        {description ? <p>{description}</p> : null}
        <div className="surveyChoiceRow">
          {question.options?.map((option) => (
            <label key={option.value} className={value === option.value ? "isSelected" : ""}>
              <input
                type="radio"
                name={question.key}
                value={option.value}
                checked={value === option.value}
                required={question.required}
                onChange={() => onChange(question.key, option.value)}
              />
              {surveyText(option.label, lang)}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <div className={`surveyField ${span}`}>
      {question.type === "file" ? null : basic ? <label htmlFor={id}>{label}</label> : <h2 className="surveyStepTitle" id={`${id}-label`}>{label}</h2>}
      {description ? <p id={`${id}-hint`} className={basic ? undefined : "surveyPromptSub"}>{description}</p> : null}
      {question.type === "textarea" ? (
        <textarea
          id={id}
          name={question.key}
          value={value}
          placeholder={placeholder}
          required={question.required}
          aria-invalid={invalid}
          aria-labelledby={basic ? undefined : `${id}-label`}
          aria-describedby={description ? `${id}-hint` : undefined}
          onChange={(event) => onChange(question.key, event.target.value)}
        />
      ) : null}
      {question.type === "select" ? (
        <select id={id} name={question.key} value={value} required={question.required} aria-invalid={invalid} onChange={(event) => onChange(question.key, event.target.value)}>
          <option value="">{placeholder}</option>
          {question.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {surveyText(option.label, lang)}
            </option>
          ))}
        </select>
      ) : null}
      {question.type === "file" ? (
        <label className="surveyUpload" htmlFor={id}>
          <input id={id} className="visuallyHidden" name={question.key} type="file" accept={question.accept || undefined} onChange={(event) => onFile(question, event.target.files?.[0])} />
          {label}
        </label>
      ) : null}
      {question.type === "text" || question.type === "email" ? (
        <input
          id={id}
          name={question.key}
          type={question.type}
          value={value}
          placeholder={placeholder}
          required={question.required}
          aria-invalid={invalid}
          autoComplete={question.type === "email" ? "email" : "off"}
          onChange={(event) => onChange(question.key, event.target.value)}
        />
      ) : null}
      {allowsAudio(question) ? (
        <>
          <p className="surveyOr">{chromeText("or", lang)}</p>
          <button type="button" className={`surveyRecord${recording ? " isRecording" : ""}`} onClick={() => onRecord(question)}>
            {recording ? chromeText("stopRecord", lang) : chromeText("record", lang)}
          </button>
        </>
      ) : null}
    </div>
  );
}
