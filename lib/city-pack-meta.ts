import { get, set } from "idb-keyval";

const DB_KEY = "city-pack-meta";

export interface CityPackMeta {
  downloadedIds: string[];
  lastUpdated: Record<string, string>;
}

const defaultMeta: CityPackMeta = {
  downloadedIds: [],
  lastUpdated: {},
};

export async function getCityPackMeta(): Promise<CityPackMeta> {
  if (typeof window === "undefined") return defaultMeta;
  const v = await get<CityPackMeta>(DB_KEY);
  return v ?? defaultMeta;
}

export async function setCityPackMeta(meta: CityPackMeta): Promise<void> {
  if (typeof window === "undefined") return;
  await set(DB_KEY, meta);
}

export async function markDownloaded(id: string, lastUpdated: string): Promise<void> {
  const m = await getCityPackMeta();
  const ids = new Set(m.downloadedIds);
  ids.add(id);
  await setCityPackMeta({
    downloadedIds: [...ids],
    lastUpdated: { ...m.lastUpdated, [id]: lastUpdated },
  });
}

export async function getDownloadedIds(): Promise<string[]> {
  const m = await getCityPackMeta();
  return m.downloadedIds;
}

export async function getLocalLastUpdated(id: string): Promise<string | undefined> {
  const m = await getCityPackMeta();
  return m.lastUpdated[id];
}

export async function removeDownloaded(id: string): Promise<void> {
  const m = await getCityPackMeta();
  const ids = m.downloadedIds.filter((x) => x !== id);
  const { [id]: _, ...rest } = m.lastUpdated;
  await setCityPackMeta({ downloadedIds: ids, lastUpdated: rest });
}
