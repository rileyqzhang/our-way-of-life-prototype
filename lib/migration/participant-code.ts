export function normalizeParticipantCode(code: string): string {
  return code.trim().toUpperCase().replace(/\d+$/, "");
}

export function canonicalParticipantSlug(codeOrSlug: string) {
  return normalizeParticipantCode(codeOrSlug).toLowerCase();
}

const PARTICIPANT_TOKEN = /^[A-Za-z]{4,6}\d*$/;
const PARTICIPANT_SUFFIX = /(NJ|NY|WE|OK|SF)$/i;

export function originalCodeFromFilename(filename: string) {
  const base = filename.split(/[\\/]/).pop() || filename;
  const tokens = base.replace(/\.docx$/i, "").split(/[^A-Za-z0-9]+/);
  const match = tokens.find((token) => PARTICIPANT_TOKEN.test(token) && PARTICIPANT_SUFFIX.test(token.replace(/\d+$/, "")));
  return match ? match.toUpperCase() : "";
}

export function codeFromFilename(filename: string) {
  const original = originalCodeFromFilename(filename);
  return original ? normalizeParticipantCode(original) : "";
}

export function participantCollisions(codes: string[]) {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const original = code.trim().toUpperCase();
    if (!original) continue;
    const canonical = normalizeParticipantCode(original);
    if (!canonical) continue;
    const list = groups.get(canonical) || [];
    if (!list.includes(original)) list.push(original);
    groups.set(canonical, list);
  }
  return [...groups.entries()]
    .filter(([, originals]) => originals.length > 1)
    .map(([canonical, originals]) => ({ canonical, originals: originals.sort() }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}

export function preferCanonicalStory<T extends { slug: string; participantCode?: string }>(stories: T[]): T[] {
  const groups = new Map<string, T>();
  for (const story of stories) {
    const key = canonicalParticipantSlug(story.participantCode || story.slug);
    const existing = groups.get(key);
    if (!existing || (story.slug === key && existing.slug !== key)) groups.set(key, story);
  }
  return [...groups.values()];
}
