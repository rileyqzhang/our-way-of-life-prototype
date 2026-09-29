import { page, person, siteSettings } from "@/cms/schemaTypes/documents";
import { localeString, localeText } from "@/cms/schemaTypes/locale";
import { photograph } from "@/cms/schemaTypes/photograph";
import { story } from "@/cms/schemaTypes/story";
import { timelineEvent } from "@/cms/schemaTypes/timelineEvent";

export const schemaTypes = [localeString, localeText, photograph, story, timelineEvent, person, page, siteSettings];
