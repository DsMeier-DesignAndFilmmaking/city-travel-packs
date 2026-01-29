const OFFLINE_KEY = "city-travel-packs-offline-slugs";

export function getOfflineSlugs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function setOfflineSlug(slug: string): void {
  if (typeof window === "undefined") return;
  const set = getOfflineSlugs();
  set.add(slug);
  localStorage.setItem(OFFLINE_KEY, JSON.stringify([...set]));
}

export function hasOfflineSlug(slug: string): boolean {
  return getOfflineSlugs().has(slug);
}
