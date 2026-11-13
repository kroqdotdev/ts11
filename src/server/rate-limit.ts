/**
 * A small sliding-window limiter for the app's own endpoints (image uploads,
 * sync). Better Auth limits its own routes. One process serves the site, so
 * memory is enough; a restart only forgets recent counts.
 */
const hits = new Map<string, number[]>();

export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const since = now - windowMs;
  const list = (hits.get(key) ?? []).filter((t) => t > since);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => t > since)) hits.delete(k);
  }
  return true;
}

export function resetRateLimits() {
  hits.clear();
}
