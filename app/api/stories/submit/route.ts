import { client } from "@/lib/sanity/client";
import { handleSurveySubmission } from "@/lib/survey/handle";
import { getShareSurvey } from "@/lib/survey/load";
import type { StoredSubmission } from "@/lib/survey/documents";

export const runtime = "nodejs";

const PAUSED = {
  error: "Story submissions are paused until the project privacy review is complete. Do not send stories, photographs, or contact details.",
};

const MAX_BODY_BYTES = 2_000_000;

export async function POST(request: Request) {
  if (process.env.SURVEY_INTAKE_ENABLED !== "true") {
    return Response.json(PAUSED, { status: 403 });
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return Response.json({ error: "Submission is too large." }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Submission could not be read." }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) return Response.json({ error: "Submission is too large." }, { status: 413 });

  const { survey } = await getShareSurvey();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await handleSurveySubmission(body && typeof body === "object" ? body : {}, {
    survey,
    intakeEnabled: true,
    ip,
    store: storeDraft,
  });
  return Response.json(result.body, { status: result.status });
}

async function storeDraft(document: StoredSubmission) {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!client || !token) throw new Error("Private submission storage is not configured.");
  const writer = client.withConfig({ token, useCdn: false, perspective: "raw" });
  await writer.createIfNotExists(document);
  return { id: document._id };
}
