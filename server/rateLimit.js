const hits = new Map();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export function checkRateLimit(ip) {
  const now = Date.now();
  let entry = hits.get(ip);

  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return false;
  }

  return true;
}

/** Cleanup stale entries periodically */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start > WINDOW_MS) hits.delete(ip);
  }
}, WINDOW_MS);
