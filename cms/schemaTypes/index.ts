import { page, person, siteSettings } from "./documents";
import { localeString, localeText } from "./locale";
import { photograph } from "./photograph";
import { story } from "./story";
import { timelineEvent } from "./timelineEvent";

export const schemaTypes = [localeString, localeText, photograph, story, timelineEvent, person, page, siteSettings];
