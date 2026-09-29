# Our Way of Life Archive — custom Next.js build

A custom, responsive replacement prototype for the WordPress/Elementor build.

## Stack

- Next.js App Router, React, TypeScript
- Plain CSS in `app/globals.css` (no Tailwind, no page-builder UI kit)
- Sanity Content Lake for published stories, timeline events, pages, and site settings
- Sanity Studio at `/studio`, including Presentation so an editor can open the matching field from a preview
- Vercel for preview and production
- GitHub for code review and handover

Local timeline JSON remains the fallback, and the source for the Sanity seed, until a Sanity project id is set.

Story intake is paused. Supabase is not the content database and the submission API does not save stories, photographs, or contact details. Design that flow only after the privacy review.

## Who owns what

Before launch, the Sanity project, GitHub repository, Vercel project, and `.com` domain should be owned by Professor Reyes or a Berkeley project account. Developers stay as admin. Do not leave the live site only on a personal account.

Formal launch still waits on INC2010471 and ISO confirmation before the production `.com` is attached.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The site redirects to `/en`, `/es`, or `/zh`.

## Routes

- `/en`, `/es`, `/zh` — home
- `/[lang]/about`
- `/[lang]/timeline`
- `/[lang]/stories` and `/[lang]/stories/[slug]`
- `/[lang]/contact`
- `/[lang]/share-your-story` — paused notice, no form
- `/studio` — Sanity Studio, after the project id is set

Participant quotations are derived from the timeline. Each language is stored on the same document as `en`, `es`, and `zh` fields, not as three separate documents.

## Connect Sanity

1. Create the Sanity project under the project owner account. Invite the developer as admin.
2. Copy [`.env.example`](.env.example) to `.env.local`.
3. Set `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and `SANITY_API_READ_TOKEN`.
4. Generate the seed and import the current timeline:

```bash
npm run sanity:seed
SANITY_API_WRITE_TOKEN=... npm run sanity:import
```

`npm run sanity:seed` writes `cms/seed/content.ndjson` (34 timeline events, the participant stories found in those events, pages, and site settings). `npm run sanity:import` sends that dataset when the write token is present. Without a token it leaves the file in place and does not call Sanity.

5. On Vercel, set the same public project id, dataset, and read token. Do not put the write token on the website runtime.
6. Open `/studio`. Presentation previews `/en`, `/es`, and `/zh`.

Images use the Sanity image CDN and `next/image` after they are uploaded in Studio. Until then, existing files in `public/timeline/` are used, with alt text. Captions, source, and usage permission are fields on each photograph.

## Deploy to Vercel

1. The GitHub repository should be under the project owner.
2. Import it into a Vercel project owned by the same account.
3. Framework preset: Next.js. Build command: `next build`.
4. Each push and pull request gets a Preview Deployment. Use that URL for review. Do not attach the production `.com` until ISO and Berkeley hosting approval.

## Accessibility

Timeline photos and story portraits require alt text. Captions are shown when present. Automatic checks do not replace a manual WCAG review. Berkeley's accessibility office is linked in the footer.

## Share Your Story

`POST /api/stories/submit` returns 403 and does not store a submission. The page explains that intake is paused. Do not collect stories, photographs, or contact information until the privacy review designs that system.
