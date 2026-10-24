import { collection } from "./collection";
import { page, person, siteSettings } from "./documents";
import { localeString, localeText } from "./locale";
import { photograph } from "./photograph";
import { story } from "./story";
import { storySubmission, survey } from "./survey";
import { timelineEvent } from "./timelineEvent";

export const schemaTypes = [localeString, localeText, photograph, collection, story, timelineEvent, person, page, siteSettings, survey, storySubmission];
