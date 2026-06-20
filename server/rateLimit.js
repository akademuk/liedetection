const hits = new Map();

const LIMITS = {
  send: { windowMs: 60_000, max: 30 },
  poll: { windowMs: 60_000, max: 120 },
};

export function checkRateLimit(ip, type = 'send') {
  const config = LIMITS[type] || LIMITS.send;
  const key = `${ip}:${type}`;
  const now = Date.now();
  let entry = hits.get(key);

  if (!entry || now - entry.start > config.windowMs) {
    entry = { start: now, count: 0 };
    hits.set(key, entry);
  }

  entry.count += 1;
  return entry.count <= config.max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    const type = key.split(':').pop();
    const windowMs = (LIMITS[type] || LIMITS.send).windowMs;
    if (now - entry.start > windowMs) hits.delete(key);
  }
}, 60_000);
