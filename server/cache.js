import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
}

function readEntry(key) {
  ensureDir();
  const file = cachePath(key);
  if (!fs.existsSync(file)) return null;
  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      fs.unlinkSync(file);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function cacheGet(key) {
  const entry = readEntry(key);
  return entry ? entry.value : null;
}

export function cacheSet(key, value, ttlSeconds) {
  ensureDir();
  const entry = {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  };
  fs.writeFileSync(cachePath(key), JSON.stringify(entry));
}

export function cacheDelete(key) {
  ensureDir();
  const file = cachePath(key);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/** Atomic lock: returns true if lock acquired */
export function cacheTryLock(key, ttlSeconds) {
  ensureDir();
  const file = cachePath(key);
  if (fs.existsSync(file)) {
    const entry = readEntry(key);
    if (entry) return false;
  }
  cacheSet(key, true, ttlSeconds);
  return true;
}

export function cacheReleaseLock(key) {
  cacheDelete(key);
}
