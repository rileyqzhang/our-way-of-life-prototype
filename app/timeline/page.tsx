import type { Metadata } from "next";
import { InteractiveTimeline } from "@/components/timeline/InteractiveTimeline";
import { timelineEvents } from "@/lib/timeline/events";

export const metadata: Metadata = {
  title: "Interactive Timeline",
  description:
    "Historical events and participant stories from the Our Way of Life Archive, in English, Spanish, and Chinese.",
};

export default function TimelinePage() {
  return (
    <section className="timelinePage">
      <div className="timelineCanvas">
        <div className="itlShapes" aria-hidden="true">
          <span className="itlShape ringLg" />
          <span className="itlShape dotSm1" />
          <span className="itlShape ringMd" />
          <span className="itlShape halfL" />
          <span className="itlShape triR" />
          <span className="itlShape dotSm2" />
          <span className="itlShape dotSm3" />
          <span className="itlShape dotSm4" />
          <span className="itlShape diamond" />
          <span className="itlShape halfR" />
          <span className="itlShape ringSm" />
          <span className="itlShape triL" />
          <span className="itlShape dotSm5" />
          <span className="itlShape ringBtm" />
        </div>
        <InteractiveTimeline events={timelineEvents} />
      </div>
    </section>
  );
}
