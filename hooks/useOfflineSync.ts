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
    const manifestUrl = `${base}/api/manifest/${encodeURIComponent(id)}.json`;
    const downloadApiUrl = `${base}/api/download-city?slug=${encodeURIComponent(id)}`;

    try {
      // 1. DISCOVERY PHASE: Fetch Page, API Data, and Manifest
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

      // 1b. MANIFEST DISCOVERY: Find icons and shortcuts to ensure PWA launches offline
      const manifestAssets = new Set<string>();
      manifestAssets.add(manifestUrl);
      
      if (manifestRes.ok) {
        const manifestData = await manifestRes.json();
        // Extract Icons
        if (Array.isArray(manifestData.icons)) {
          manifestData.icons.forEach((icon: any) => {
            if (icon.src) manifestAssets.add(new URL(icon.src, base).href);
          });
        }
        // Extract Shortcuts
        if (Array.isArray(manifestData.shortcuts)) {
          manifestData.shortcuts.forEach((s: any) => {
            if (s.url) manifestAssets.add(new URL(s.url, base).href);
            if (Array.isArray(s.icons)) {
              s.icons.forEach((icon: any) => {
                if (icon.src) manifestAssets.add(new URL(icon.src, base).href);
              });
            }
          });
        }
      }

      /**
       * NEXT.JS DATA URL DISCOVERY
       */
      let nextDataUrl = "";
      const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
      if (buildIdMatch && buildIdMatch[1]) {
        const buildId = buildIdMatch[1];
        nextDataUrl = `${base}/_next/data/${buildId}/city/${encodeURIComponent(id)}.json`;
      }

      // Combine all unique assets into a single list
      const allUrls = Array.from(new Set([
        pageUrl, 
        apiUrl, 
        downloadApiUrl,
        ...(nextDataUrl ? [nextDataUrl] : []),
        ...Array.from(manifestAssets), // Added Manifest + Icons
        ...fromHtml, 
        ...fromJson
      ]));

      // 2. DELEGATION PHASE: Send to SW
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

      // 3. FALLBACK PHASE: Manual caching
      const cache = await caches.open(cityCacheName(id));
      
      // Store already fetched resources
      await cache.put(new Request(pageUrl), new Response(html, { headers: docRes.headers }));
      await cache.put(new Request(apiUrl), new Response(JSON.stringify(apiData), { headers: apiDataRes.headers }));

      const total = allUrls.length;
      let completed = 2;

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
      const page = await cache.match(pageUrl);
      return !!page;
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