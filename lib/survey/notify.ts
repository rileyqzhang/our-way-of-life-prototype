export type ReviewNotice = {
  subject: string;
  text: string;
};

export function buildReviewNotice(input: { submissionId: string; reviewUrl: string }): ReviewNotice {
  return {
    subject: `Share Your Story submission ${input.submissionId}`,
    text: [
      "A new Share Your Story response is waiting in the protected Studio review.",
      `Submission: ${input.submissionId}`,
      `Review: ${input.reviewUrl}`,
      "This message does not include the participant's story, health information, or contact details.",
    ].join("\n"),
  };
}

export function reviewUrlFor(submissionId: string) {
  const configured = process.env.SURVEY_REVIEW_URL?.trim();
  if (configured) return configured;
  const studio = process.env.SANITY_STUDIO_PREVIEW_URL?.trim() || "http://localhost:3000";
  return `${studio.replace(/\/$/, "")}/studio/intent/edit/id=${encodeURIComponent(submissionId)};type=storySubmission`;
}

export function notificationConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const to = process.env.SURVEY_NOTIFY_TO?.trim() || "";
  const from = process.env.SURVEY_NOTIFY_FROM?.trim() || "";
  return { apiKey, to, from, configured: Boolean(apiKey && to && from) };
}

export async function sendReviewNotice(notice: ReviewNotice) {
  const config = notificationConfig();
  if (!config.configured) return { sent: false as const, reason: "not_configured" as const };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: notice.subject,
      text: notice.text,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}`);
  }
  return { sent: true as const, reason: "sent" as const };
}
