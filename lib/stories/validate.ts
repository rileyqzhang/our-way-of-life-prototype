import { communities, storyLanguages, themes } from "@/lib/stories/form-options";
import type { FieldErrors, StoryLanguage, StorySubmissionInput } from "@/types/story";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
] as const;
export const ADDITIONAL_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COMMUNITY_VALUES = new Set<string>(communities.map((item) => item.value));
const LANGUAGE_VALUES = new Set<string>(storyLanguages.map((item) => item.value));
const THEME_VALUES = new Set<string>(themes);

function isFilePresent(file: File | null | undefined): file is File {
  return Boolean(file && file.size > 0 && file.name);
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".webm"];
const ADDITIONAL_EXTENSIONS = [...IMAGE_EXTENSIONS, ".pdf", ".txt", ".doc", ".docx"];

function fileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function isAllowedUpload(file: File, allowedTypes: readonly string[], allowedExtensions: string[]): boolean {
  if (file.type && allowedTypes.includes(file.type)) return true;
  const extension = fileExtension(file.name);
  if (!file.type || file.type === "application/octet-stream") {
    return allowedExtensions.includes(extension);
  }
  return false;
}

function validateUpload(
  file: File | null | undefined,
  allowedTypes: readonly string[],
  allowedExtensions: string[],
  label: string,
): string | undefined {
  if (!isFilePresent(file)) return undefined;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${label} must be 2 MB or smaller. Larger oral-history audio will use a direct upload later.`;
  }
  if (!isAllowedUpload(file, allowedTypes, allowedExtensions)) {
    return `${label} must be a supported file type.`;
  }
  return undefined;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function readBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "yes";
}

export function parseSubmissionFormData(formData: FormData): StorySubmissionInput {
  const language = readString(formData, "language") as StoryLanguage;
  const selectedThemes = formData
    .getAll("themes")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    displayName: readString(formData, "displayName"),
    email: readString(formData, "email"),
    language,
    languageOther: readString(formData, "languageOther") || undefined,
    title: readString(formData, "title"),
    story: readString(formData, "story"),
    community: readString(formData, "community"),
    themes: selectedThemes,
    image: readFile(formData, "image"),
    audio: readFile(formData, "audio"),
    additionalFile: readFile(formData, "additionalFile"),
    imageAlt: readString(formData, "imageAlt") || undefined,
    consent: readBoolean(formData, "consent"),
    permissionToContact: readBoolean(formData, "permissionToContact"),
  };
}

export function validateSubmission(input: StorySubmissionInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.displayName) {
    errors.displayName = "Enter a name or preferred display name.";
  } else if (input.displayName.length > 120) {
    errors.displayName = "Display name must be 120 characters or fewer.";
  }

  if (!input.email) {
    errors.email = "Enter an email address so the research team can follow up.";
  } else if (!EMAIL_PATTERN.test(input.email) || input.email.length > 254) {
    errors.email = "Enter a valid email address.";
  }

  if (!LANGUAGE_VALUES.has(input.language)) {
    errors.language = "Choose a preferred language.";
  } else if (input.language === "other" && !input.languageOther) {
    errors.languageOther = "Please name the language you prefer.";
  }

  if (!input.title) {
    errors.title = "Enter a title for your story.";
  } else if (input.title.length > 200) {
    errors.title = "Title must be 200 characters or fewer.";
  }

  if (!input.story) {
    errors.story = "Enter your story.";
  } else if (input.story.length < 40) {
    errors.story = "Please share a little more so the research team can review your story.";
  } else if (input.story.length > 20000) {
    errors.story = "Story text must be 20,000 characters or fewer.";
  }

  if (!input.community || !COMMUNITY_VALUES.has(input.community)) {
    errors.community = "Choose a community or collection.";
  }

  const invalidTheme = input.themes.find((theme) => !THEME_VALUES.has(theme));
  if (invalidTheme) {
    errors.themes = "Choose themes from the list provided.";
  }

  const imageError = validateUpload(input.image, IMAGE_TYPES, IMAGE_EXTENSIONS, "Image or artwork");
  if (imageError) errors.image = imageError;

  if (isFilePresent(input.image) && !input.imageAlt) {
    errors.imageAlt = "Add a short description of the image for people who cannot see it.";
  }

  const audioError = validateUpload(input.audio, AUDIO_TYPES, AUDIO_EXTENSIONS, "Audio");
  if (audioError) errors.audio = audioError;

  const additionalError = validateUpload(
    input.additionalFile,
    ADDITIONAL_TYPES,
    ADDITIONAL_EXTENSIONS,
    "Additional file",
  );
  if (additionalError) errors.additionalFile = additionalError;

  if (!input.consent) {
    errors.consent = "Consent is required before a story can be submitted for review.";
  }

  return errors;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
