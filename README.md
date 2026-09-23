# Our Way of Life Archive — custom Next.js build

A custom, responsive replacement prototype for the WordPress/Elementor build.

## Stack
- Next.js App Router
- TypeScript
- Plain CSS (no page builder, no Tailwind dependency)
- Designed for Vercel deployment
- Supabase-ready story submissions (optional until credentials are added)

## Run locally
```bash
npm install
npm run dev
```
Then open http://localhost:3000.

## Current routes
- `/` Home
- `/about`
- `/timeline`
- `/stories`
- `/share-your-story`
- `/contact`

## Share Your Story submissions

The `/share-your-story` form posts to `POST /api/stories/submit`. Submissions are stored with status `submitted` and are **not** published automatically.

Intended workflow:

`submitted` → `reviewing` → `awaiting_approval` → `approved` → `published`

(`rejected` is also supported.)

### Local testing without Supabase

If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, `next dev` saves submission metadata to `data/submissions.json` (gitignored). File names are stored; file bytes are not persisted in local mode.

### Connect Supabase later

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. That creates `story_submissions`, status values, RLS (public read of `published` rows only), and private storage buckets.
3. Copy [`.env.example`](.env.example) to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public; not used to insert submissions)
   - `SUPABASE_SERVICE_ROLE_KEY` (**server only** — never put this in client code)
4. On Vercel, add the same variables in Project Settings → Environment Variables.

The API uses the service role on the server so unpublished emails and files stay off the public anon client. Uploaded files are stored in private buckets; the database keeps a storage path (not a public URL) until a later publishing step.

### Upload limits

Vercel request bodies are limited to about 4.5 MB. Each image, audio, or additional file is capped at **2 MB** for now. Larger oral-history audio should later upload directly to Supabase Storage with a signed URL instead of traveling through the API route.

## Deploy to Vercel
1. Put this folder in a GitHub repository.
2. Import the repo into Vercel.
3. Vercel will detect Next.js automatically.
4. Framework preset: Next.js; build command: `next build`; output: automatic.

## Next content steps
- Migrate one verified story into a CMS/data model.
- Replace placeholder About copy with verified project copy.
- Migrate verified timeline events.
- Add review / participant-approval tools for submissions.
- Confirm Berkeley hosting/accessibility requirements before replacing the current public site.
