"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers the global PWA service worker ONLY on non-city routes and only in production (STEP A).
 * City routes opt-out of global PWA identity and use the city-scoped SW only.
 * Ensures no global SW conflicts with city-specific SWs.
 */
export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (pathname?.startsWith("/city/")) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => console.log("[Global SW] Registered with scope:", reg.scope))
      .catch((err) => console.error("[Global SW] Registration failed:", err));
  }, [pathname]);

  return null;
}