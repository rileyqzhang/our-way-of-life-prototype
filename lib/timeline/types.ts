export type TimelineLanguage = "en" | "es" | "zh";

export type LocalizedText = Record<TimelineLanguage, string>;

export type TimelineParagraph = {
  type: "paragraph";
  text: LocalizedText;
  emphasis?: "caption";
};

export type TimelineParticipant = {
  type: "participant";
  code: string;
  href: string;
  avatar: string;
  title: LocalizedText;
};

export type TimelineVideo = {
  type: "video";
  src: string;
  title: string;
};

export type TimelineLink = {
  type: "link";
  href: string;
  image: string;
  imageAlt: string;
  title: LocalizedText;
  description: LocalizedText;
  domain: string;
};

export type TimelineBlock = TimelineParagraph | TimelineParticipant | TimelineVideo | TimelineLink;

export type TimelineEvent = {
  id: string;
  date: string;
  title: LocalizedText;
  blocks: TimelineBlock[];
};
