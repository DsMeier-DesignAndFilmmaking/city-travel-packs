"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers the global PWA service worker ONLY on non-city routes (Step 12).
 * City routes opt-out of global PWA identity and use the city-scoped SW only.
 * Does not break existing offline behavior on home, list, etc.
 */
export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (pathname?.startsWith("/city/")) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => console.log("[Global SW] Registered with scope:", reg.scope))
      .catch((err) => console.error("[Global SW] Registration failed:", err));
  }, [pathname]);

  return null;
}