"use client";

import { useEffect } from "react";

/**
 * PWA Bridge: when the app is opened from the Home Screen (standalone),
 * wait for the Service Worker to be ready and send WAKE_UP_STANDALONE
 * so the SW claims the client and bridges the "Sandbox Gap" for first launch.
 */
export function PWABridge() {
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
