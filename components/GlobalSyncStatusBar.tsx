"use client";

import { useEffect, useState } from "react";

const CITY_PACK_COUNT = 10;

type SyncStatus = "idle" | "syncing" | "ready";

export function GlobalSyncStatusBar() {
  const [status, setStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "PRECACHE_STARTED") {
        setStatus("syncing");
      }
      if (data.type === "PRECACHE_COMPLETE") {
        setStatus("ready");
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    // If SW is already active and we missed the messages, assume ready
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.active && navigator.serviceWorker.controller) {
        timeoutId = setTimeout(() => {
          setStatus((s) => (s === "idle" ? "ready" : s));
        }, 500);
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-white/10 bg-[#0f172a]/90 px-4 py-2 text-center text-sm text-zinc-300 backdrop-blur-sm"
    >
      {status === "syncing" && (
        <span>
          Syncing {CITY_PACK_COUNT} city packs for offline use…
        </span>
      )}
      {status === "ready" && (
        <span className="font-medium text-emerald-400/90">
          ✅ {CITY_PACK_COUNT} Cities Offline Ready
        </span>
      )}
    </div>
  );
}
