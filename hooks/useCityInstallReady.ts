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
    return url.pathname.includes("/api/manifest/") && url.pathname.includes(cityId);
  } catch {
    return false;
  }
}

/**
 * Checks if the city-scoped service worker is registered and active.
 */
async function isCitySwActive(cityId: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const scopeSuffix = `/city/${cityId}/`;
    const reg = registrations.find((r) => r.scope.endsWith(scopeSuffix));
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
    
    const options = { ignoreSearch: true };
    const matched =
      (await cache.match(pathPrefix, options)) ||
      (await cache.match(pathPrefix + "/", options));

    if (matched) return true;

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

    // 1. Initial check on mount
    recheck();

    // 2. LISTEN FOR SERVICE WORKER MESSAGES
    // This catches the 'CITY_SW_ACTIVATED' message from lib/city-sw-script.ts
    const handleMessage = (event: MessageEvent) => {
      if (cancelled) return;
      if (event.data?.type === 'CITY_SW_ACTIVATED' && event.data?.slug === cityId) {
        console.log(`[PWA] City SW active signal received for ${cityId}`);
        recheck();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // 3. LISTEN FOR CUSTOM DOM EVENTS (Optional fallback for sync logic)
    const onCitySwActivated = () => {
      if (!cancelled) recheck();
    };
    window.addEventListener("city-sw-activated", onCitySwActivated);

    // 4. POLLING FALLBACK
    // Still useful if the user manually deletes cache or if messages are missed.
    const interval = setInterval(() => {
      if (cancelled) return;
      checkCityInstallReady(cityId).then((ready) => {
        if (!cancelled && ready !== isCityInstallReady) {
          setIsCityInstallReady(ready);
        }
      });
    }, 2500);

    return () => {
      cancelled = true;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      window.removeEventListener("city-sw-activated", onCitySwActivated);
      clearInterval(interval);
    };
  }, [cityId, recheck, isCityInstallReady]);

  return { isCityInstallReady, recheck };
}