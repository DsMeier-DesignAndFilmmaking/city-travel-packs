"use client";

import { useCallback, useState } from "react";
import { extractUrlsFromHtml, extractUrlsFromJson } from "@/lib/offline-sync-urls";
import { markDownloaded, removeDownloaded } from "@/lib/city-pack-meta";
import { removeOfflineSlug } from "@/lib/offline-store";

const CACHE_PREFIX = "city-pack-";
const CACHE_SUFFIX = "-v1";

function cityCacheName(id: string): string {
  return CACHE_PREFIX + id + CACHE_SUFFIX;
}

async function getCitySwRegistration(slug: string): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return null;
  const regs = await navigator.serviceWorker.getRegistrations();
  const scopeSuffix = `/city/${slug}/`; 
  return regs.find((r) => r.scope.endsWith(scopeSuffix)) ?? null;
}

export type OfflineSyncState = "idle" | "syncing" | "ready" | "error";

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
    const downloadApiUrl = `${base}/api/download-city?slug=${encodeURIComponent(id)}`;

    try {
      // 1. DISCOVERY PHASE: Fetch the page and API data to find JS/CSS dependencies
      // We do this first regardless of SW status so we have the full URL list.
      const [docRes, apiDataRes] = await Promise.all([
        fetch(pageUrl),
        fetch(apiUrl)
      ]);

      if (!docRes.ok || !apiDataRes.ok) throw new Error("Failed to reach city server");

      const html = await docRes.text();
      const apiData = await apiDataRes.json();
      
      const fromHtml = extractUrlsFromHtml(html, base);
      const fromJson = extractUrlsFromJson(apiData, base);
      const lastUpdated = typeof apiData?.lastUpdated === "string" ? apiData.lastUpdated : "";

      // Combine all unique assets into a single list
      const allUrls = Array.from(new Set([
        pageUrl, 
        apiUrl, 
        downloadApiUrl,
        ...fromHtml, 
        ...fromJson
      ]));

      // 2. DELEGATION PHASE: If Service Worker is active, send it the full URL list
      const reg = await getCitySwRegistration(id);
      if (reg?.active) {
        const done = new Promise<void>((resolve, reject) => {
          const handler = (e: MessageEvent) => {
            const d = e.data;
            if (d?.type !== "download-city-pack-done" || d?.slug !== id) return;
            navigator.serviceWorker.removeEventListener("message", handler);
            if (d.error) reject(new Error(d.error));
            else resolve();
          };
          navigator.serviceWorker.addEventListener("message", handler);
          
          // Trigger the SW to download the specific list we found
          reg.active?.postMessage({ 
            type: "download-city-pack", 
            slug: id,
            urls: allUrls 
          });
        });

        await done;
        setProgress(100);
        setState("ready");
        await markDownloaded(id, lastUpdated);
        return;
      }

      // 3. FALLBACK PHASE: Manual caching if no SW registration found
      const cache = await caches.open(cityCacheName(id));
      
      // Cache the clones we already have from the discovery phase
      await cache.put(new Request(pageUrl), new Response(html, { headers: docRes.headers }));
      await cache.put(new Request(apiUrl), new Response(JSON.stringify(apiData), { headers: apiDataRes.headers }));

      const total = allUrls.length;
      let completed = 2; // HTML and API are done

      for (const u of allUrls) {
        if (u === apiUrl || u === pageUrl) continue;
        try {
          await fetchAndCache(cache, u);
        } catch (e) {
          console.warn(`[Sync] Skipping failed asset: ${u}`);
        }
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      setProgress(100);
      setState("ready");
      await markDownloaded(id, lastUpdated);
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
      const pageUrl = `${base}/city/${encodeURIComponent(id)}`;
      const apiUrl = `${base}/api/cities/${encodeURIComponent(id)}`;
      
      const [page, api] = await Promise.all([
        cache.match(pageUrl),
        cache.match(apiUrl),
      ]);
      return !!(page && api);
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