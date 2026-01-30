"use client";

import { useCallback, useState } from "react";
import { extractUrlsFromHtml, extractUrlsFromJson } from "@/lib/offline-sync-urls";
import { markDownloaded, removeDownloaded } from "@/lib/city-pack-meta";
import { removeOfflineSlug } from "@/lib/offline-store";

const CACHE_PREFIX = "city-pack-";

function cityCacheName(id: string): string {
  return CACHE_PREFIX + id;
}

export type OfflineSyncState =
  | "idle"
  | "syncing"
  | "ready"
  | "error";

export interface UseOfflineSyncResult {
  state: OfflineSyncState;
  progress: number;
  error: string | null;
  sync: (id: string, opts?: { onSyncFailed?: () => void }) => Promise<void>;
  isReady: (id: string) => Promise<boolean>;
  removeOfflineData: (id: string) => Promise<void>;
}

async function fetchAndCache(
  cache: Cache,
  url: string,
  requestInit?: RequestInit
): Promise<Response> {
  const req = new Request(url, { method: "GET", ...requestInit });
  const res = await fetch(req);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const clone = res.clone();
  await cache.put(req, clone);
  return res;
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [state, setState] = useState<OfflineSyncState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (id: string, opts?: { onSyncFailed?: () => void }) => {
    if (typeof caches === "undefined") {
      setError("Cache API not supported");
      setState("error");
      return;
    }

    setError(null);
    setState("syncing");
    setProgress(0);

    const base = window.location.origin;
    const apiUrl = `${base}/api/cities/${encodeURIComponent(id)}`;
    const pageUrl = `${base}/city/${encodeURIComponent(id)}`;

    try {
      const cache = await caches.open(cityCacheName(id));

      // 1. Fetch and cache API JSON
      const jsonRes = await fetch(apiUrl);
      if (!jsonRes.ok) throw new Error(`API ${jsonRes.status}`);
      const jsonClone = jsonRes.clone();
      await cache.put(new Request(apiUrl), jsonClone);
      const data = (await jsonRes.json()) as { lastUpdated?: string };
      const fromJson = extractUrlsFromJson(data, base);
      const lastUpdated = typeof data?.lastUpdated === "string" ? data.lastUpdated : "";

      // 2. Fetch and cache document
      const docRes = await fetch(pageUrl);
      if (!docRes.ok) throw new Error(`Page ${docRes.status}`);
      const docClone = docRes.clone();
      await cache.put(new Request(pageUrl), docClone);
      const html = await docRes.text();
      const fromHtml = extractUrlsFromHtml(html, base);

      const allUrls = new Set<string>([apiUrl, pageUrl, ...fromJson, ...fromHtml]);
      const urls = [...allUrls];
      const total = urls.length;
      let done = 2;
      setProgress(total ? Math.round((done / total) * 100) : 100);

      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        if (u === apiUrl || u === pageUrl) continue;
        try {
          await fetchAndCache(cache, u);
        } catch (e) {
          throw new Error(`Failed to cache ${u}: ${e instanceof Error ? e.message : String(e)}`);
        }
        done++;
        setProgress(Math.round((done / total) * 100));
      }

      setProgress(100);
      setState("ready");
      if (lastUpdated) await markDownloaded(id, lastUpdated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
      opts?.onSyncFailed?.();
    }
  }, []);

  const isReady = useCallback(async (id: string): Promise<boolean> => {
    if (typeof caches === "undefined") return false;
    try {
      const cache = await caches.open(cityCacheName(id));
      const base = window.location.origin;
      const apiUrl = `${base}/api/cities/${encodeURIComponent(id)}`;
      const pageUrl = `${base}/city/${encodeURIComponent(id)}`;
      const [a, b] = await Promise.all([
        cache.match(apiUrl),
        cache.match(pageUrl),
      ]);
      return !!(a && b);
    } catch {
      return false;
    }
  }, []);

  const removeOfflineData = useCallback(async (id: string): Promise<void> => {
    if (typeof caches === "undefined") return;
    try {
      await caches.delete(cityCacheName(id));
      removeOfflineSlug(id);
      await removeDownloaded(id);
    } catch {
      // best effort
    }
  }, []);

  return { state, progress, error, sync, isReady, removeOfflineData };
}
