"use client";

import { useEffect } from "react";

const CITY_SW_CACHE_NAME_PREFIX = "city-pack-";
const CITY_SW_CACHE_NAME_SUFFIX = "-v1";

/**
 * Registers the city-scoped service worker only on city-specific pages.
 * Waits for activation and dispatches city-sw-activated so download/install UI can proceed.
 */
export function useCitySwRegistration(slug: string): void {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const swUrl = `/city/${encodeURIComponent(slug)}/sw.js`;
    const scope = `/city/${encodeURIComponent(slug)}/`;
    const cacheName = `${CITY_SW_CACHE_NAME_PREFIX}${slug}${CITY_SW_CACHE_NAME_SUFFIX}`;

    const onActive = () => {
      console.log("[City SW] active and ready for install", { scope, cacheName });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("city-sw-activated", { detail: { slug } }));
      }
    };

    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((reg) => {
        if (reg.active) {
          onActive();
          return;
        }
        const worker = reg.installing ?? reg.waiting;
        if (worker) {
          const onStateChange = () => {
            if (worker.state === "activated") {
              onActive();
              worker.removeEventListener("statechange", onStateChange);
            }
          };
          worker.addEventListener("statechange", onStateChange);
          if (worker.state === "activated") onActive();
        }
      })
      .catch((err) => {
        console.error("[City SW] Registration failed", err);
      });
  }, [slug]);
}
