"use client";

import { useEffect, useId, useRef, useState } from "react";
import { communities, storyLanguages, themes } from "@/lib/stories/form-options";
import { hasFieldErrors, MAX_UPLOAD_BYTES, validateSubmission } from "@/lib/stories/validate";
import type { FieldErrors, StoryLanguage } from "@/types/story";

const fieldOrder = [
  "displayName",
  "email",
  "language",
  "languageOther",
  "title",
  "story",
  "community",
  "themes",
  "image",
  "imageAlt",
  "audio",
  "additionalFile",
  "consent",
] as const;

const fieldLabels: Record<string, string> = {
  displayName: "Name or preferred display name",
  email: "Email",
  language: "Preferred language",
  languageOther: "Other language",
  title: "Story title",
  story: "Story text",
  community: "Community / collection",
  themes: "Themes",
  image: "Image or artwork",
  imageAlt: "Image description",
  audio: "Audio",
  additionalFile: "Additional file",
  consent: "Consent",
};

function fileFromInput(input: HTMLInputElement | null): File | null {
  const file = input?.files?.[0];
  return file && file.size > 0 ? file : null;
}

function describeFile(file: File | null): string {
  if (!file) return "No file selected.";
  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  return `${file.name} (${sizeKb} KB)`;
}

type SubmitResult = { id: string; status: string; storage: string };

export function StorySubmissionForm() {
  const formId = useId();
  const errorSummaryId = `${formId}-errors`;
  const successId = `${formId}-success`;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const [language, setLanguage] = useState<StoryLanguage>("english");
  const [hasImage, setHasImage] = useState(false);
  const [imageName, setImageName] = useState("No file selected.");
  const [audioName, setAudioName] = useState("No file selected.");
  const [additionalName, setAdditionalName] = useState("No file selected.");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (result) {
      document.getElementById(successId)?.focus();
    }
  }, [result, successId]);

  function describedBy(field: string, extra?: string) {
    const ids = [extra];
    if (errors[field]) ids.push(`${formId}-${field}-error`);
    return ids.filter(Boolean).join(" ") || undefined;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      displayName: String(formData.get("displayName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      language: String(formData.get("language") ?? "") as StoryLanguage,
      languageOther: String(formData.get("languageOther") ?? "").trim() || undefined,
      title: String(formData.get("title") ?? "").trim(),
      story: String(formData.get("story") ?? "").trim(),
      community: String(formData.get("community") ?? "").trim(),
      themes: formData.getAll("themes").filter((value): value is string => typeof value === "string"),
      image: fileFromInput(imageInputRef.current),
      audio: fileFromInput(audioInputRef.current),
      additionalFile: fileFromInput(additionalInputRef.current),
      imageAlt: String(formData.get("imageAlt") ?? "").trim() || undefined,
      consent: formData.get("consent") === "on",
      permissionToContact: formData.get("permissionToContact") === "on",
    };

    const nextErrors = validateSubmission(input);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        document.getElementById(errorSummaryId)?.focus();
      });
      return;
    }

    setErrors({});
    setPending(true);

    try {
      const response = await fetch("/api/stories/submit", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        fields?: FieldErrors;
        id?: string;
        status?: string;
        storage?: string;
      };

      if (!response.ok) {
        if (payload.fields) {
          setErrors(payload.fields);
          requestAnimationFrame(() => {
            document.getElementById(errorSummaryId)?.focus();
          });
        } else {
          setServerError(payload.error ?? "The story could not be submitted. Please try again.");
        }
        return;
      }

      setResult({
        id: payload.id ?? "",
        status: payload.status ?? "submitted",
        storage: payload.storage ?? "local",
      });
      form.reset();
      setLanguage("english");
      setHasImage(false);
      setImageName("No file selected.");
      setAudioName("No file selected.");
      setAdditionalName("No file selected.");
    } catch {
      setServerError("The story could not be submitted. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="formSuccess" id={successId} tabIndex={-1} role="status">
        <p className="eyebrow">Received</p>
        <h3>Thank you. Your story is with the research team.</h3>
        <p>
          Submitting a story does not automatically publish it. The research team will review the
          submission and contact you for approval before publication.
        </p>
        <p className="formSuccessMeta">
          Status: {result.status}
          {result.storage === "local" ? " · saved locally for development" : ""}
        </p>
        <button type="button" className="button" onClick={() => setResult(null)}>
          Submit another story
        </button>
      </div>
    );
  }

  const errorList = fieldOrder.filter((field) => errors[field]);

  return (
    <form className="storyForm" onSubmit={onSubmit} noValidate aria-busy={pending}>
      {errorList.length > 0 ? (
        <div className="formErrorSummary" id={errorSummaryId} tabIndex={-1} role="alert">
          <p>Please fix the following before submitting:</p>
          <ul>
            {errorList.map((field) => (
              <li key={field}>
                <a href={`#${formId}-${field}`}>{errors[field]}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {serverError ? (
        <p className="formServerError" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="formGrid">
        <div className="formField">
          <label htmlFor={`${formId}-displayName`}>{fieldLabels.displayName}</label>
          <p className="fieldHint" id={`${formId}-displayName-hint`}>
            This can be a full name, a chosen display name, or initials.
          </p>
          <input
            id={`${formId}-displayName`}
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={describedBy("displayName", `${formId}-displayName-hint`)}
          />
          {errors.displayName ? (
            <p className="fieldError" id={`${formId}-displayName-error`}>
              {errors.displayName}
            </p>
          ) : null}
        </div>

        <div className="formField">
          <label htmlFor={`${formId}-email`}>{fieldLabels.email}</label>
          <p className="fieldHint" id={`${formId}-email-hint`}>
            Used only so the research team can contact you. It is not published with your story.
          </p>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("email", `${formId}-email-hint`)}
          />
          {errors.email ? (
            <p className="fieldError" id={`${formId}-email-error`}>
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="formFieldset">
        <legend id={`${formId}-language`}>{fieldLabels.language}</legend>
        <div className="choiceGrid" role="radiogroup" aria-labelledby={`${formId}-language`} aria-describedby={describedBy("language")}>
          {storyLanguages.map((option) => (
            <label key={option.value} className="choiceCard">
              <input
                type="radio"
                name="language"
                value={option.value}
                checked={language === option.value}
                onChange={() => setLanguage(option.value)}
                required
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.language ? (
          <p className="fieldError" id={`${formId}-language-error`}>
            {errors.language}
          </p>
        ) : null}
      </fieldset>

      {language === "other" ? (
        <div className="formField">
          <label htmlFor={`${formId}-languageOther`}>{fieldLabels.languageOther}</label>
          <input
            id={`${formId}-languageOther`}
            name="languageOther"
            type="text"
            maxLength={80}
            required
            aria-invalid={Boolean(errors.languageOther)}
            aria-describedby={describedBy("languageOther")}
          />
          {errors.languageOther ? (
            <p className="fieldError" id={`${formId}-languageOther-error`}>
              {errors.languageOther}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="formField">
        <label htmlFor={`${formId}-title`}>{fieldLabels.title}</label>
        <input
          id={`${formId}-title`}
          name="title"
          type="text"
          maxLength={200}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title")}
        />
        {errors.title ? (
          <p className="fieldError" id={`${formId}-title-error`}>
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="formField">
        <label htmlFor={`${formId}-story`}>{fieldLabels.story}</label>
        <p className="fieldHint" id={`${formId}-story-hint`}>
          Share the moments, people, and places that matter to this story.
        </p>
        <textarea
          id={`${formId}-story`}
          name="story"
          rows={12}
          required
          aria-invalid={Boolean(errors.story)}
          aria-describedby={describedBy("story", `${formId}-story-hint`)}
        />
        {errors.story ? (
          <p className="fieldError" id={`${formId}-story-error`}>
            {errors.story}
          </p>
        ) : null}
      </div>

      <div className="formField">
        <label htmlFor={`${formId}-community`}>{fieldLabels.community}</label>
        <select
          id={`${formId}-community`}
          name="community"
          required
          defaultValue=""
          aria-invalid={Boolean(errors.community)}
          aria-describedby={describedBy("community")}
        >
          <option value="" disabled>
            Select a collection
          </option>
          {communities.map((community) => (
            <option key={community.value} value={community.value}>
              {community.label}
            </option>
          ))}
        </select>
        {errors.community ? (
          <p className="fieldError" id={`${formId}-community-error`}>
            {errors.community}
          </p>
        ) : null}
      </div>

      <fieldset className="formFieldset">
        <legend id={`${formId}-themes`}>{fieldLabels.themes}</legend>
        <p className="fieldHint" id={`${formId}-themes-hint`}>
          Optional. Select every theme that fits.
        </p>
        <div className="themeGrid">
          {themes.map((theme) => (
            <label key={theme} className="choiceCard">
              <input type="checkbox" name="themes" value={theme} />
              <span>{theme}</span>
            </label>
          ))}
        </div>
        {errors.themes ? (
          <p className="fieldError" id={`${formId}-themes-error`}>
            {errors.themes}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="formFieldset">
        <legend>Files</legend>
        <p className="fieldHint">
          Files are optional. Each file must be 2 MB or smaller so the form can run on Vercel. Supported
          images: JPEG, PNG, WebP, GIF. Supported audio: MP3, WAV, M4A, AAC, WebM.
        </p>

        <div className="formField">
          <label htmlFor={`${formId}-image`}>{fieldLabels.image}</label>
          <p className="fieldHint" id={`${formId}-image-hint`}>
            You may include a photo or artwork. This is not required.
          </p>
          <input
            id={`${formId}-image`}
            ref={imageInputRef}
            name="image"
            type="file"
            accept={".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"}
            aria-invalid={Boolean(errors.image)}
            aria-describedby={describedBy("image", `${formId}-image-hint ${formId}-image-name`)}
            onChange={(event) => {
              const file = fileFromInput(event.currentTarget);
              setHasImage(Boolean(file));
              setImageName(describeFile(file));
            }}
          />
          <p className="fileName" id={`${formId}-image-name`}>
            {imageName}
          </p>
          {errors.image ? (
            <p className="fieldError" id={`${formId}-image-error`}>
              {errors.image}
            </p>
          ) : null}
        </div>

        {hasImage ? (
          <div className="formField">
            <label htmlFor={`${formId}-imageAlt`}>{fieldLabels.imageAlt}</label>
            <input
              id={`${formId}-imageAlt`}
              name="imageAlt"
              type="text"
              maxLength={200}
              required
              aria-invalid={Boolean(errors.imageAlt)}
              aria-describedby={describedBy("imageAlt")}
            />
            {errors.imageAlt ? (
              <p className="fieldError" id={`${formId}-imageAlt-error`}>
                {errors.imageAlt}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="formField">
          <label htmlFor={`${formId}-audio`}>Optional audio upload</label>
          <input
            id={`${formId}-audio`}
            ref={audioInputRef}
            name="audio"
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,audio/*"
            aria-invalid={Boolean(errors.audio)}
            aria-describedby={describedBy("audio", `${formId}-audio-name`)}
            onChange={(event) => setAudioName(describeFile(fileFromInput(event.currentTarget)))}
          />
          <p className="fileName" id={`${formId}-audio-name`}>
            {audioName}
          </p>
          {errors.audio ? (
            <p className="fieldError" id={`${formId}-audio-error`}>
              {errors.audio}
            </p>
          ) : null}
        </div>

        <div className="formField">
          <label htmlFor={`${formId}-additionalFile`}>Optional additional file</label>
          <input
            id={`${formId}-additionalFile`}
            ref={additionalInputRef}
            name="additionalFile"
            type="file"
            accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.webp"
            aria-invalid={Boolean(errors.additionalFile)}
            aria-describedby={describedBy("additionalFile", `${formId}-additionalFile-name`)}
            onChange={(event) => setAdditionalName(describeFile(fileFromInput(event.currentTarget)))}
          />
          <p className="fileName" id={`${formId}-additionalFile-name`}>
            {additionalName}
          </p>
          {errors.additionalFile ? (
            <p className="fieldError" id={`${formId}-additionalFile-error`}>
              {errors.additionalFile}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="formFieldset">
        <legend>Review and contact</legend>
        <label className="choiceCard choiceCardWide" htmlFor={`${formId}-consent`}>
          <input
            id={`${formId}-consent`}
            name="consent"
            type="checkbox"
            required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={describedBy("consent")}
          />
          <span>
            I understand that submitting this story does not publish it. The research team may review it
            and contact me before any publication.
          </span>
        </label>
        {errors.consent ? (
          <p className="fieldError" id={`${formId}-consent-error`}>
            {errors.consent}
          </p>
        ) : null}

        <label className="choiceCard choiceCardWide" htmlFor={`${formId}-permissionToContact`}>
          <input id={`${formId}-permissionToContact`} name="permissionToContact" type="checkbox" />
          <span>The research team may contact me about this submission.</span>
        </label>
      </fieldset>

      <p className="reviewNotice">
        Submitting a story does not automatically publish it. The research team will review the
        submission and contact the participant for approval before publication.
      </p>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit story for review"}
      </button>
      <p className="fieldHint">Maximum file size is {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB per file.</p>
    </form>
  );
}
