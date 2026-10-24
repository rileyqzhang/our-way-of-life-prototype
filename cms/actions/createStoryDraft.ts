import { useClient } from "sanity";
import type { DocumentActionComponent } from "sanity";
import { storyDraftFromSubmission } from "@/lib/survey/documents";
import type { SurveyAnswer } from "@/lib/survey/types";

type SubmissionShape = {
  status?: string;
  publicationAuthorized?: boolean;
  participantCode?: string;
  language?: string;
  answers?: SurveyAnswer[];
  _id?: string;
};

export const createStoryDraftAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: "2024-10-01" });
  const doc = (props.draft || props.published) as SubmissionShape | null;
  const prepared = storyDraftFromSubmission({ ...doc, _id: props.id });
  return {
    label: "Create unpublished story draft",
    disabled: !prepared.ok,
    title: prepared.ok
      ? "Copies the narrative answers into a draft story. It does not publish the story or the submission."
      : "Set the status to Approved, confirm that the participant authorized publication, and enter a participant code first.",
    onHandle: async () => {
      const current = storyDraftFromSubmission({ ...(props.draft || props.published), _id: props.id } as SubmissionShape);
      if (!current.ok) return;
      await client.createIfNotExists(current.document);
      props.onComplete();
    },
  };
};
