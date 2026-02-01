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
  
  const isOpaque = res.type === 'opaque' || res.status === 0;
  if (!res.ok && !isOpaque) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }

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
    const pageUrlWithSlash = `${pageUrl}/`; 
    const manifestUrl = `${base}/api/manifest/${encodeURIComponent(id)}.json`;
    const downloadApiUrl = `${base}/api/download-city?slug=${encodeURIComponent(id)}`;

    try {
      // 1. DISCOVERY PHASE
      const [docRes, apiDataRes, manifestRes] = await Promise.all([
        fetch(pageUrl),
        fetch(apiUrl),
        fetch(manifestUrl)
      ]);

      if (!docRes.ok || !apiDataRes.ok) throw new Error("Failed to reach city server");

      const html = await docRes.text();
      const apiData = await apiDataRes.json();
      
      const fromHtml = extractUrlsFromHtml(html, base);
      const fromJson = extractUrlsFromJson(apiData, base);
      const lastUpdated = typeof apiData?.lastUpdated === "string" ? apiData.lastUpdated : "";

      const manifestAssets = new Set<string>();
      manifestAssets.add(manifestUrl);
      
      let manifestData: any = null;
      if (manifestRes.ok) {
        manifestData = await manifestRes.json();
        if (Array.isArray(manifestData.icons)) {
          manifestData.icons.forEach((icon: any) => {
            if (icon.src) manifestAssets.add(new URL(icon.src, base).href);
          });
        }
      }

      let nextDataUrl = "";
      const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
      if (buildIdMatch && buildIdMatch[1]) {
        nextDataUrl = `${base}/_next/data/${buildIdMatch[1]}/city/${encodeURIComponent(id)}.json`;
      }

      // 2. COMBINE ALL URLS FOR BULK SYNC
      const allUrls = Array.from(new Set([
        pageUrl,
        pageUrlWithSlash,
        apiUrl, 
        downloadApiUrl,
        ...(nextDataUrl ? [nextDataUrl] : []),
        ...Array.from(manifestAssets),
        ...fromHtml, 
        ...fromJson
      ]));

      // 3. PRE-CACHE ENTRY POINTS (MANDATORY FOR STANDALONE)
      // This ensures the vault is populated before the SW starts or the user flips to airplane mode.
      const cache = await caches.open(cityCacheName(id));
      
      const pageResponse = () => new Response(html, { 
        headers: { "Content-Type": "text/html; charset=utf-8" } 
      });

      await Promise.all([
        // Cache both variants so the manifest "start_url" always finds a match
        cache.put(new Request(pageUrl), pageResponse()),
        cache.put(new Request(pageUrlWithSlash), pageResponse()),
        
        // Cache API data
        cache.put(new Request(apiUrl), new Response(JSON.stringify(apiData), { 
          headers: { "Content-Type": "application/json" } 
        })),

        // Cache the manifest itself (so the browser can verify the app identity offline)
        manifestData ? cache.put(new Request(manifestUrl), new Response(JSON.stringify(manifestData), {
          headers: { "Content-Type": "application/manifest+json" }
        })) : Promise.resolve()
      ]);
      
      setProgress(10);

      // 4. DELEGATION TO SERVICE WORKER
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

      // 5. FALLBACK PHASE: Manual caching
      const total = allUrls.length;
      let completed = 5; // Starting higher due to pre-cached items

      for (const u of allUrls) {
        if (u === apiUrl || u === pageUrl || u === pageUrlWithSlash || u === manifestUrl) continue;
        
        try {
          await fetchAndCache(cache, u);
        } catch (e) {
          console.warn(`[Sync] Asset failed: ${u}`, e);
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
      // Check for either variant
      const match = await cache.match(pageUrl, { ignoreSearch: true }) || 
                    await cache.match(pageUrl + '/', { ignoreSearch: true });
      return !!match;
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
    } catch { /* ignored */ }
  }, []);

  return { state, progress, error, sync, isReady, removeOfflineData };
}