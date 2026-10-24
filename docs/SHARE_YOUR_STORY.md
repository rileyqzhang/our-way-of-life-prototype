# Share Your Story — privacy hold

The recovered questionnaire is a civic-participation research instrument. It asks for age, gender, race/ethnicity, country of origin, languages, years in the United States, years in the current city, education, voting, volunteering, health conditions, a personal email address, a creative work, and seven life-story prompts. Health details, identity, and contact information are sensitive research data.

This repository already pauses story intake until privacy review. The project notes name INC2010471 and an ISO confirmation before the production domain is attached. Those reviews have not been confirmed in this codebase.

Because of that, `SURVEY_INTAKE_ENABLED` is unset. The public page shows the questionnaire and does not post it. `POST /api/stories/submit` returns 403 and does not read or store the body.

Do not set `SURVEY_INTAKE_ENABLED=true`, and do not publish a survey document, until the project confirms whether institutional review, research consent, and a data-retention rule are required. The recovered introduction already says the study will ask for approval before publication. It does not state a retention period, and this implementation does not invent one.

When intake is explicitly enabled later:

- Responses are created as Sanity drafts (`drafts.storySubmission-…`), not published documents.
- The public archive query does not read `storySubmission`.
- Studio removes the publish action for submissions.
- Image and audio bytes are not uploaded. Sanity file assets are served from a public CDN, so they are the wrong store for recordings and photographs.
- A reviewer can create an unpublished story draft only after status is Approved, publication authorization is checked, and a participant code is entered. Demographics, health, and email are not copied into that story.
- Resend mail, when `RESEND_API_KEY`, `SURVEY_NOTIFY_TO`, and `SURVEY_NOTIFY_FROM` are all set, contains the submission id and a Studio link. It does not contain the story.
