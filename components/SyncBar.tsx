"use client";

import { useEffect, useState } from "react";

const CITY_COUNT = 10;

type SyncBarStatus = "idle" | "syncing" | "ready";

/**
 * Sync Bar: shows eager sync progress so users trust that data is being
 * pre-booted. Only show "Offline Ready" once the install event has
 * finished and city JSONs are cached—treat Share-to-Home-Screen like
 * a download that isn’t “complete” until 100% offline ready.
 */
export function SyncBar() {
  const [status, setStatus] = useState<SyncBarStatus>("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "PRECACHE_STARTED") setStatus("syncing");
      if (data.type === "PRECACHE_COMPLETE") setStatus("ready");
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    function checkRegistration(reg: ServiceWorkerRegistration) {
      if (reg.installing) setStatus((s) => (s === "ready" ? s : "syncing"));
      else if (reg.active && navigator.serviceWorker.controller)
        setStatus((s) => (s === "idle" ? "ready" : s));
    }

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) checkRegistration(reg);
    });
    void navigator.serviceWorker.ready.then(checkRegistration);

    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[#C9A227]/20 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-xl items-center justify-center gap-2">
        {status === "syncing" && (
          <>
            <span className="text-[#C9A227]" aria-hidden>⚡</span>
            <span className="text-sm font-medium text-zinc-200">
              Syncing {CITY_COUNT} Cities for Offline…
            </span>
          </>
        )}
        {status === "ready" && (
          <>
            <span className="text-emerald-400" aria-hidden>✅</span>
            <span className="text-sm font-semibold text-emerald-400/95">
              {CITY_COUNT} Cities Offline Ready
            </span>
          </>
        )}
      </div>
    </div>
  );
}
