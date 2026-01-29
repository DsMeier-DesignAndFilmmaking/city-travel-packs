"use client";

import { useEffect } from "react";

/**
 * Silent Handshake: when the app is opened from the Home Screen (standalone),
 * immediately notify the Service Worker so it claims this client and serves
 * the pre-booted cache (partition bridge). Eliminates double-download on iOS.
 */
export function PWAHandshake() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({ type: "WAKE_UP_STANDALONE" });
      }
    });
  }, []);

  return null;
}
