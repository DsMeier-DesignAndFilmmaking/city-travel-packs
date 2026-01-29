"use client";

import { useEffect } from "react";

/**
 * PWA Bridge (Silent Handshake): when the app is opened from the Home Screen
 * (standalone) or with ?mode=standalone, wait for the Service Worker to be
 * ready and send WAKE_UP_STANDALONE so the SW claims the client and bridges
 * the iOS "Sandbox Gap" for immediate data population (online or offline).
 */
export function PWABridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const url = new URL(window.location.href);
    const hasModeStandalone = url.searchParams.get("mode") === "standalone";

    if (!isStandalone && !hasModeStandalone) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({ type: "WAKE_UP_STANDALONE" });
      }
    });
  }, []);

  return null;
}
