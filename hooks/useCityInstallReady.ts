"use client";

import { useCallback, useEffect, useState } from "react";

const CITY_CACHE_SUFFIX = "-v1";

function cityScopeCacheName(cityId: string): string {
  return `city-pack-${cityId}${CITY_CACHE_SUFFIX}`;
}

/**
 * Checks if the city manifest is currently injected.
 */
function hasCityManifestInjected(cityId: string): boolean {
  if (typeof document === "undefined") return false;
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link?.href) return false;
  try {
    const url = new URL(link.href, document.baseURI);
    // Matches /api/manifest/tokyo.json or /api/manifest/tokyo
    return url.pathname.includes("/api/manifest/") && url.pathname.includes(cityId);
  } catch {
    return false;
  }
}

/**
 * Checks if the city-scoped service worker is registered and active.
 * CRITICAL: We look for the explicit trailing slash scope we set in SyncButton.
 */
async function isCitySwActive(cityId: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    // The browser returns absolute URLs for scopes, e.g., "https://example.com/city/tokyo/"
    const scopeSuffix = `/city/${cityId}/`;
    const reg = registrations.find((r) => r.scope.endsWith(scopeSuffix));
    
    // It must exist AND be active (ready to intercept fetch events)
    return !!(reg && reg.active);
  } catch {
    return false;
  }
}

/**
 * Checks if the main city page is actually in the cache.
 */
async function hasCityAssetsCached(cityId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cacheName = cityScopeCacheName(cityId);
    const cache = await caches.open(cacheName);
    
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const pathPrefix = `${base}/city/${encodeURIComponent(cityId)}`;
    
    // We check the three most common ways this page might be accessed/cached
    // 1. /city/tokyo
    // 2. /city/tokyo/
    // 3. /city/tokyo?ignore=this
    const options = { ignoreSearch: true };
    const matched =
      (await cache.match(pathPrefix, options)) ||
      (await cache.match(pathPrefix + "/", options));

    if (matched) return true;

    // Fallback: Manually check keys if match fails (extra safety)
    const keys = await cache.keys();
    return keys.some(req => {
      const url = new URL(req.url);
      return url.pathname === `/city/${cityId}` || url.pathname === `/city/${cityId}/`;
    });
  } catch {
    return false;
  }
}

/**
 * Runs all three checks to confirm the pack is 100% offline-ready.
 */
async function checkCityInstallReady(cityId: string): Promise<boolean> {
  const [manifestOk, swOk, cacheOk] = await Promise.all([
    Promise.resolve(hasCityManifestInjected(cityId)),
    isCitySwActive(cityId),
    hasCityAssetsCached(cityId),
  ]);
  
  return manifestOk && swOk && cacheOk;
}

export interface UseCityInstallReadyResult {
  isCityInstallReady: boolean;
  recheck: () => Promise<void>;
}

export function useCityInstallReady(cityId: string): UseCityInstallReadyResult {
  const [isCityInstallReady, setIsCityInstallReady] = useState(false);

  const recheck = useCallback(async () => {
    if (!cityId) return;
    const ready = await checkCityInstallReady(cityId);
    setIsCityInstallReady(ready);
  }, [cityId]);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;

    // Initial check
    recheck();

    // Listen for custom activation events from the SW registration logic
    const onCitySwActivated = () => {
      if (!cancelled) recheck();
    };
    window.addEventListener("city-sw-activated", onCitySwActivated);

    // Polling as a fallback (Service Worker states can be tricky to event-listen)
    const interval = setInterval(() => {
      if (cancelled) return;
      checkCityInstallReady(cityId).then((ready) => {
        if (!cancelled && ready !== isCityInstallReady) {
          setIsCityInstallReady(ready);
        }
      });
    }, 2000);

    return () => {
      cancelled = true;
      window.removeEventListener("city-sw-activated", onCitySwActivated);
      clearInterval(interval);
    };
  }, [cityId, recheck, isCityInstallReady]);

  return { isCityInstallReady, recheck };
}