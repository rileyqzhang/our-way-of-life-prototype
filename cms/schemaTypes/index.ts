import { collection } from "./collection";
import { collectionPage } from "./collectionPage";
import { page, person, siteSettings } from "./documents";
import { localeBlock, localeString, localeText } from "./locale";
import { photograph } from "./photograph";
import { publication } from "./publication";
import { researchAccessPage } from "./researchAccess";
import { researchMethodologyPage, researchPublicationsPage } from "./researchPages";
import { story } from "./story";
import { storySubmission, survey } from "./survey";
import { timelineEvent } from "./timelineEvent";

export const schemaTypes = [
  localeString,
  localeText,
  localeBlock,
  photograph,
  collection,
  collectionPage,
  story,
  publication,
  researchAccessPage,
  researchMethodologyPage,
  researchPublicationsPage,
  timelineEvent,
  person,
  page,
  siteSettings,
  survey,
  storySubmission,
];
