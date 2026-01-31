"use client";

import { useEffect } from "react";

const CITY_CACHE_PREFIX = "city-pack-";
const CITY_CACHE_SUFFIX = "-v1";

function isCityScopeCacheName(name: string): boolean {
  return name.startsWith(CITY_CACHE_PREFIX) && name.endsWith(CITY_CACHE_SUFFIX);
}

/**
 * Dev-only verification checklist for city-scoped micro-PWA (Step 13).
 * Logs only; no UI changes.
 * Identity is defined before install, not after — a city pack is a scoped micro-PWA.
 */
export function useCityPwaVerificationChecklist(slug: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const run = async () => {
      const prefix = "[City PWA Verification]";
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      const isStandalone =
        typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

      // 1. Installed app scope equals /city/[city]/
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const cityScopePath = `/city/${slug}/`;
          const expectedScopeHref = new URL(cityScopePath, window.location.origin).href;
          const cityReg = regs.find((r) => r.scope === expectedScopeHref || r.scope.endsWith(cityScopePath));
          if (cityReg) {
            const scopeCheck = cityReg.scope === expectedScopeHref ? "pass" : "fail";
            console.log(`${prefix} 1. Scope equals /city/[city]/: ${scopeCheck}`, { scope: cityReg.scope, expected: cityScopePath });
          } else {
            console.log(`${prefix} 1. Scope equals /city/[city]/: no city registration found`);
          }
        } catch (e) {
          console.log(`${prefix} 1. Scope check error:`, e);
        }
      }

      // 2. Cache contains only one city (only this city's city-pack-*-v1)
      let cacheCheck = "skip";
      if (typeof caches !== "undefined") {
        try {
          const names = await caches.keys();
          const cityCaches = names.filter(isCityScopeCacheName);
          const thisCityCache = `city-pack-${slug}${CITY_CACHE_SUFFIX}`;
          const onlyThisCity = cityCaches.length === 1 && cityCaches[0] === thisCityCache;
          cacheCheck = onlyThisCity ? "pass" : cityCaches.length === 0 ? "no city caches" : "fail";
          console.log(`${prefix} 2. Cache contains only one city: ${cacheCheck}`, {
            cityCacheNames: cityCaches,
            currentCityCache: thisCityCache,
          });
        } catch (e) {
          console.log(`${prefix} 2. Cache check error:`, e);
        }
      }

      // 3. Opening the app launches directly into that city
      const launchCheck =
        isStandalone && (pathname === `/city/${slug}` || pathname.startsWith(`/city/${slug}/`)) ? "pass" : isStandalone ? "fail" : "skip (browser)";
      console.log(`${prefix} 3. App launches directly into this city: ${launchCheck}`, {
        displayMode: isStandalone ? "standalone" : "browser",
        pathname,
        expectedPrefix: `/city/${slug}`,
      });

      // 4. Installing a second city creates a second standalone app (expectation only)
      console.log(`${prefix} 4. Installing another city creates a separate standalone app (verify manually: install second city, confirm two icons).`);

      console.log(`${prefix} --- Identity is defined before install; a city pack is a scoped micro-PWA. ---`);
    };

    run();
  }, [slug]);
}
