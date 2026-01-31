"use client";

import { useCallback, useEffect, useState } from "react";

const CITY_CACHE_SUFFIX = "-v1";

function cityScopeCacheName(cityId: string): string {
  return `city-pack-${cityId}${CITY_CACHE_SUFFIX}`;
}

/**
 * Checks if the city manifest is currently injected (link rel=manifest points to city manifest).
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
 * Checks if the city-scoped service worker is registered and active for this city.
 */
async function isCitySwActive(cityId: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const scopeSuffix = `/city/${cityId}/`;
    const reg = registrations.find((r) => r.scope.endsWith(scopeSuffix));
    return !!reg?.active;
  } catch {
    return false;
  }
}

/**
 * Checks if required city assets are in the city-scoped cache (city-pack-{id}-v1).
 * The city SW may have cached the page with or without query string (e.g. ?standalone=true).
 */
async function hasCityAssetsCached(cityId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cacheName = cityScopeCacheName(cityId);
    const cache = await caches.open(cacheName);
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const pathPrefix = `${base}/city/${encodeURIComponent(cityId)}`;
    const matched =
      (await cache.match(pathPrefix)) ||
      (await cache.match(`${pathPrefix}?standalone=true`)) ||
      (await cache.match(pathPrefix + "/"));
    if (matched) return true;
    const keys = await cache.keys();
    const hasPage = keys.some(
      (req) => req.url.startsWith(pathPrefix) && (req.url === pathPrefix || req.url.charAt(pathPrefix.length) === "?" || req.url.charAt(pathPrefix.length) === "/")
    );
    return hasPage;
  } catch {
    return false;
  }
}

/**
 * Runs all three checks and returns true only when city is install-ready.
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

/**
 * Gates "Ready: Add to Home Screen" so it only becomes active when:
 * - City manifest is injected
 * - City service worker is registered and active
 * - Required city assets are cached (city-pack-{id}-v1 has the city page)
 */
export function useCityInstallReady(cityId: string): UseCityInstallReadyResult {
  const [isCityInstallReady, setIsCityInstallReady] = useState(false);

  const recheck = useCallback(async () => {
    const ready = await checkCityInstallReady(cityId);
    setIsCityInstallReady(ready);
  }, [cityId]);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    recheck().then(() => {
      if (cancelled) return;
    });

    const onCitySwActivated = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === cityId && !cancelled) void recheck();
    };
    window.addEventListener("city-sw-activated", onCitySwActivated);

    const interval = setInterval(() => {
      if (cancelled) return;
      checkCityInstallReady(cityId).then((ready) => {
        if (!cancelled) setIsCityInstallReady(ready);
      });
    }, 1500);

    return () => {
      cancelled = true;
      window.removeEventListener("city-sw-activated", onCitySwActivated);
      clearInterval(interval);
    };
  }, [cityId, recheck]);

  return { isCityInstallReady, recheck };
}
