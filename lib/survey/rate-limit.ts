const hits = new Map<string, number[]>();

export function resetSubmissionRateLimit() {
  hits.clear();
}

export function allowSubmission(ip: string, now = Date.now(), limit = 5, windowMs = 10 * 60 * 1000) {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
