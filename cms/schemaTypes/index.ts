import { collection } from "./collection";
import { page, person, siteSettings } from "./documents";
import { localeBlock, localeString, localeText } from "./locale";
import { photograph } from "./photograph";
import { publication } from "./publication";
import { researchAccessPage } from "./researchAccess";
import { story } from "./story";
import { storySubmission, survey } from "./survey";
import { timelineEvent } from "./timelineEvent";

export const schemaTypes = [
  localeString,
  localeText,
  localeBlock,
  photograph,
  collection,
  story,
  publication,
  researchAccessPage,
  timelineEvent,
  person,
  page,
  siteSettings,
  survey,
  storySubmission,
];
