export type StoryStatus =
  | "submitted"
  | "reviewing"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "rejected";

export type StoryLanguage = "english" | "spanish" | "chinese" | "other";

export interface StorySubmission {
  id: string;
  displayName: string;
  email: string;
  language: StoryLanguage;
  languageOther?: string;
  title: string;
  story: string;
  community: string;
  themes: string[];
  imageUrl?: string;
  imageAlt?: string;
  audioUrl?: string;
  additionalFileUrl?: string;
  consent: boolean;
  permissionToContact: boolean;
  status: StoryStatus;
  createdAt: string;
}

export interface PublishedStoryCard {
  id: string;
  quote: string;
  identifier: string;
  location: string;
  imageAlt: string;
  scene: "courthouse" | "clinic" | "studio";
  quoteLang?: "en" | "es";
  href?: string;
  comingSoon?: boolean;
}

export type StorySubmissionInput = Omit<
  StorySubmission,
  "id" | "status" | "createdAt" | "imageUrl" | "audioUrl" | "additionalFileUrl"
> & {
  image?: File | null;
  audio?: File | null;
  additionalFile?: File | null;
};

export type FieldErrors = Partial<Record<string, string>>;
