import type { TimelineEvent } from "@/lib/timeline/types";
import events from "@/lib/timeline/events.json";

/** Migrated from the live archive timeline (wjxqmv.top / ourwayoflifearchive.com). */
export const timelineEvents = events as TimelineEvent[];
