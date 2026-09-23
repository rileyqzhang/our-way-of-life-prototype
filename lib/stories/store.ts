import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { StorySubmission, StorySubmissionInput } from "@/types/story";

export class StoreUnavailableError extends Error {
  constructor(message = "Story storage is not connected yet.") {
    super(message);
    this.name = "StoreUnavailableError";
  }
}

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, "submissions.json");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "upload";
}

function fileMeta(file: File | null | undefined): string | undefined {
  if (!file || file.size === 0) return undefined;
  return file.name;
}

async function createLocalSubmission(input: StorySubmissionInput): Promise<StorySubmission> {
  const submission: StorySubmission = {
    id: crypto.randomUUID(),
    displayName: input.displayName,
    email: input.email,
    language: input.language,
    languageOther: input.languageOther,
    title: input.title,
    story: input.story,
    community: input.community,
    themes: input.themes,
    imageUrl: fileMeta(input.image),
    imageAlt: input.imageAlt,
    audioUrl: fileMeta(input.audio),
    additionalFileUrl: fileMeta(input.additionalFile),
    consent: input.consent,
    permissionToContact: input.permissionToContact,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };

  await mkdir(LOCAL_DATA_DIR, { recursive: true });

  let existing: StorySubmission[] = [];
  try {
    const raw = await readFile(LOCAL_DATA_FILE, "utf8");
    existing = JSON.parse(raw) as StorySubmission[];
  } catch {
    existing = [];
  }

  existing.push(submission);
  await writeFile(LOCAL_DATA_FILE, JSON.stringify(existing, null, 2), "utf8");
  return submission;
}

async function uploadToBucket(
  bucket: "story-images" | "story-audio" | "story-files",
  folder: string,
  file: File,
): Promise<string> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new StoreUnavailableError();
  }

  const objectPath = `${folder}/${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload file to ${bucket}: ${error.message}`);
  }

  // Buckets stay private until a later publishing step. Store the object path, not a public URL.
  return `${bucket}/${objectPath}`;
}

async function createSupabaseSubmission(input: StorySubmissionInput): Promise<StorySubmission> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new StoreUnavailableError();
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const imageUrl = input.image && input.image.size > 0
    ? await uploadToBucket("story-images", id, input.image)
    : undefined;
  const audioUrl = input.audio && input.audio.size > 0
    ? await uploadToBucket("story-audio", id, input.audio)
    : undefined;
  const additionalFileUrl = input.additionalFile && input.additionalFile.size > 0
    ? await uploadToBucket("story-files", id, input.additionalFile)
    : undefined;

  const row = {
    id,
    display_name: input.displayName,
    email: input.email,
    language: input.language,
    language_other: input.languageOther ?? null,
    title: input.title,
    story: input.story,
    community: input.community,
    themes: input.themes,
    image_url: imageUrl ?? null,
    image_alt: input.imageAlt ?? null,
    audio_url: audioUrl ?? null,
    additional_file_url: additionalFileUrl ?? null,
    consent: input.consent,
    permission_to_contact: input.permissionToContact,
    status: "submitted" as const,
    created_at: createdAt,
  };

  const { error } = await client.from("story_submissions").insert(row);
  if (error) {
    throw new Error(`Could not save submission: ${error.message}`);
  }

  return {
    id,
    displayName: input.displayName,
    email: input.email,
    language: input.language,
    languageOther: input.languageOther,
    title: input.title,
    story: input.story,
    community: input.community,
    themes: input.themes,
    imageUrl,
    imageAlt: input.imageAlt,
    audioUrl,
    additionalFileUrl,
    consent: input.consent,
    permissionToContact: input.permissionToContact,
    status: "submitted",
    createdAt,
  };
}

export type SubmissionStorage = "supabase" | "local";

export async function createSubmission(
  input: StorySubmissionInput,
): Promise<{ submission: StorySubmission; storage: SubmissionStorage }> {
  if (isSupabaseConfigured()) {
    return { submission: await createSupabaseSubmission(input), storage: "supabase" };
  }

  if (process.env.NODE_ENV === "development") {
    return { submission: await createLocalSubmission(input), storage: "local" };
  }

  throw new StoreUnavailableError(
    "Supabase is not configured. Add credentials on the server before accepting submissions in production.",
  );
}
