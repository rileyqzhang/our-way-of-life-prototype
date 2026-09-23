-- Our Way of Life Archive: story submissions
-- Run this in the Supabase SQL editor after creating a project.
-- Submissions are created with status = 'submitted' and are never auto-published.

create type public.story_status as enum (
  'submitted',
  'reviewing',
  'awaiting_approval',
  'approved',
  'published',
  'rejected'
);

create table public.story_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null,
  language text not null,
  language_other text,
  title text not null,
  story text not null,
  community text not null,
  themes text[] not null default '{}',
  image_url text,
  image_alt text,
  audio_url text,
  additional_file_url text,
  consent boolean not null,
  permission_to_contact boolean not null default false,
  status public.story_status not null default 'submitted',
  created_at timestamptz not null default now()
);

create index story_submissions_status_idx on public.story_submissions (status);
create index story_submissions_created_at_idx on public.story_submissions (created_at desc);

alter table public.story_submissions enable row level security;

-- Public visitors may only read stories that have completed review and approval.
create policy "Public can read published stories"
  on public.story_submissions
  for select
  to anon, authenticated
  using (status = 'published');

-- Inserts, updates, and unpublished reads are done by the Next.js server
-- using the service role key, which bypasses RLS. Do not expose that key
-- to the browser. The anon key must not be used to insert submissions.

insert into storage.buckets (id, name, public)
values
  ('story-images', 'story-images', false),
  ('story-audio', 'story-audio', false),
  ('story-files', 'story-files', false)
on conflict (id) do nothing;

-- Keep buckets private until a later publishing step issues signed URLs.
-- The server uploads with the service role. No public storage policies yet.
