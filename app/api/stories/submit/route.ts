export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    {
      error:
        "Story submissions are paused until the project privacy review is complete. Do not send stories, photographs, or contact details.",
    },
    { status: 403 },
  );
}
