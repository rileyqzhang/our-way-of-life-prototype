import { createSubmission, StoreUnavailableError } from "@/lib/stories/store";
import { hasFieldErrors, parseSubmissionFormData, validateSubmission } from "@/lib/stories/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Could not read the submitted form." }, { status: 400 });
  }

  const input = parseSubmissionFormData(formData);
  const fieldErrors = validateSubmission(input);
  if (hasFieldErrors(fieldErrors)) {
    return Response.json({ error: "validation", fields: fieldErrors }, { status: 400 });
  }

  try {
    const { submission, storage } = await createSubmission(input);
    return Response.json(
      {
        id: submission.id,
        status: submission.status,
        storage,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof StoreUnavailableError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    console.error("Story submission failed", error);
    return Response.json(
      { error: "Could not save this submission. Please try again, or contact the archive if the problem continues." },
      { status: 500 },
    );
  }
}
